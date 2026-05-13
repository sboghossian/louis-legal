/**
 * Graph-walking runner for the Drafting Board.
 *
 * Pure(ish) functions — no React, but `runNode` performs a real fetch
 * against `${API_BASE}/chat`. The page wraps these with `setBoard(...)`
 * to apply transitions and animate the canvas.
 *
 * Algorithm: Kahn's topological order, with three rules:
 *   1. A node is "ready" when all its inbound edges come from `done` nodes.
 *   2. `gate` nodes never auto-advance; when they become ready they switch
 *      to `needs_approval` and the runner pauses until the user clicks
 *      Approve / Reject in the inspector.
 *   3. `agent` and `output` nodes fire a real chat completion via SSE.
 *      Status flow: idle → running (fetch in flight) → done (text shown).
 *
 * Concurrency: NOT supported. The page holds a single in-flight promise
 * and serializes the walk via `pickNext` + `await runNode`.
 *
 * Backend contract assumed today:
 *   - POST `${API_BASE}/chat` with SSE response.
 *   - Events: `chat_id`, `routing`, `content_delta`, `content_done`.
 *   - 401 → user is signed out or has no model key configured.
 */

import { streamChat } from "@/app/lib/louisApi";
import type {
    Board,
    BoardChatMessage,
    BoardNode,
    NodeStatus,
    StatusTransition,
} from "./types";

export interface AdvanceResult {
    nextBoard: Board;
    /** Plain-prose event the page can append to its timeline. */
    log?: string;
    /** Whether the runner thinks the graph is now done or paused. */
    done: boolean;
}

/** Soft cap so streaming a long-winded response can't run away on us. */
const MAX_OUTPUT_CHARS = 4000;

function now(): number {
    return Date.now();
}

function transition(
    node: BoardNode,
    to: NodeStatus,
    note?: string,
): BoardNode {
    if (node.status === to) return node;
    const t: StatusTransition = {
        at: now(),
        from: node.status,
        to,
        note,
    };
    return {
        ...node,
        status: to,
        history: [...node.history, t],
        reason: to === "blocked" || to === "rejected" ? note : node.reason,
    };
}

function predecessorsOf(board: Board, id: string): string[] {
    return board.edges.filter((e) => e.to === id).map((e) => e.from);
}

function successorsOf(board: Board, id: string): string[] {
    return board.edges.filter((e) => e.from === id).map((e) => e.to);
}

function statusOf(board: Board, id: string): NodeStatus | undefined {
    return board.nodes.find((n) => n.id === id)?.status;
}

/**
 * Return the next "leading" node — the first idle node whose predecessors
 * are all `done`. If a gate is ready it's flipped to `needs_approval`
 * inside the returned board and we pause.
 */
export function pickNext(board: Board): {
    nextBoard: Board;
    candidate: BoardNode | null;
    paused: boolean;
    note?: string;
} {
    for (const node of board.nodes) {
        if (node.status !== "idle") continue;
        const preds = predecessorsOf(board, node.id);
        const allDone = preds.every((p) => statusOf(board, p) === "done");
        if (!allDone) continue;

        if (node.kind === "gate") {
            // Flip to needs_approval and pause.
            const flipped = transition(
                node,
                "needs_approval",
                "All upstream steps are done. Waiting on a human.",
            );
            return {
                nextBoard: {
                    ...board,
                    nodes: board.nodes.map((n) =>
                        n.id === node.id ? flipped : n,
                    ),
                },
                candidate: flipped,
                paused: true,
                note: `Gate "${node.title}" is waiting on ${node.approver ?? "approval"}.`,
            };
        }
        return { nextBoard: board, candidate: node, paused: false };
    }
    return { nextBoard: board, candidate: null, paused: false };
}

/**
 * Flip a node to `running` (used by the page right before it `await`s
 * `runNode`, so the UI commits the spinner before the network call).
 */
export function markRunning(board: Board, nodeId: string): Board {
    return {
        ...board,
        nodes: board.nodes.map((n) =>
            n.id === nodeId ? transition(n, "running") : n,
        ),
    };
}

/**
 * Build the focused user prompt for a node. Kept separate so the seam
 * is easy to test and tweak.
 */
function promptForNode(node: BoardNode, board: Board): string {
    const templateLabel = board.name;
    const skillsHint =
        node.skills.length > 0
            ? ` Lean on these skills if available: ${node.skills.join(", ")}.`
            : "";
    const inputsHint =
        node.inputs.length > 0
            ? ` Inputs available to you: ${node.inputs.join("; ")}.`
            : "";
    const outputsHint =
        node.outputs.length > 0
            ? ` Deliverables expected: ${node.outputs.join("; ")}.`
            : "";
    return (
        `You are operating on the '${node.title}' step of the '${templateLabel}' workflow. ` +
        `Produce the deliverable. Be concise (max 200 words). Plain prose, no markdown headers.` +
        skillsHint +
        inputsHint +
        outputsHint
    );
}

export interface RunNodeOptions {
    /** Abort signal — pass the page's controller so Pause cancels the fetch. */
    signal?: AbortSignal;
    /** Called with the partial streamed text on every `content_delta`. */
    onPartial?: (partialText: string) => void;
}

export interface RunNodeOutcome {
    /** Final board state with the node flipped to `done` (or `blocked` on error). */
    nextBoard: Board;
    /** True when the node finished cleanly. */
    success: boolean;
    /** Plain-prose log line. */
    log: string;
    /** HTTP status code on failure (used to detect 401). */
    httpStatus?: number;
    /** Final assistant text (empty string on failure). */
    output: string;
    /** Routing metadata captured from the SSE `routing` event. */
    model?: string;
    playbookSlug?: string;
}

/**
 * Build the messages array the model sees for this node:
 *   [
 *     {user: "Step 1 prompt"},  {assistant: "Step 1 output"},
 *     {user: "Step 2 prompt"},  {assistant: "Step 2 output"},
 *     ...
 *     {user: "current step prompt"}
 *   ]
 *
 * `priorMessages` is what we've accumulated across the board run so far.
 * The current node's prompt becomes the new user turn at the end.
 *
 * If `priorMessages` is empty (first node of the run), the first item gets
 * a short system-style preamble naming the workflow so the assistant
 * understands the whole arc up front.
 */
function buildThreadedMessages(
    node: BoardNode,
    board: Board,
    priorMessages: BoardChatMessage[],
): { role: "user" | "assistant"; content: string }[] {
    const promptForCurrent = promptForNode(node, board);
    if (priorMessages.length === 0) {
        return [
            {
                role: "user",
                content:
                    `You are running the "${board.name}" agentic workflow as a single ` +
                    `conversation. Each user turn names one step of the workflow; you ` +
                    `produce the deliverable for that step in plain prose, max 200 ` +
                    `words, no markdown headers. Later steps will reference earlier ` +
                    `outputs — keep them concrete + reusable.\n\n` +
                    `Step 1 — ${promptForCurrent}`,
            },
        ];
    }
    // Subsequent steps: keep the role/content pairs verbatim, append the new step.
    return [
        ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: promptForCurrent },
    ];
}

/**
 * Run a single node end-to-end: open the SSE stream, accumulate the
 * assistant's content, write `lastOutput` + routing metadata, return the
 * updated board.
 *
 * Caller responsibility: flip the node to `running` first (so the spinner
 * shows before the network round-trip). Use `markRunning(board, id)` for
 * that.
 */
export async function runNode(
    board: Board,
    nodeId: string,
    options: RunNodeOptions = {},
): Promise<RunNodeOutcome> {
    const node = board.nodes.find((n) => n.id === nodeId);
    if (!node) {
        return {
            nextBoard: board,
            success: false,
            log: `Node ${nodeId} not found.`,
            output: "",
        };
    }

    // Gates never call the model — that's a human decision.
    if (node.kind === "gate") {
        return {
            nextBoard: board,
            success: false,
            log: `${node.title} is a human gate — no model call.`,
            output: "",
        };
    }

    // v2: thread the board's running conversation. Node N+1 sees node N's
    // output as a prior assistant turn — the model treats the whole board
    // run as a single chat. chatId is captured from the SSE on first run
    // and reused for every subsequent node so the run shows up in
    // /all-chats as one persisted thread.
    const priorMessages = board.runMessages ?? [];
    const messages = buildThreadedMessages(node, board, priorMessages);

    let collected = "";
    let model: string | undefined;
    let playbookSlug: string | undefined;
    let httpStatus: number | undefined;
    let capturedChatId: string | undefined = board.chatId;

    try {
        const response = await streamChat({
            messages,
            // Reuse the board's chat thread on every node after the first.
            chat_id: board.chatId,
            autoRouteModel: true,
            signal: options.signal,
        });

        httpStatus = response.status;

        if (!response.ok) {
            const errText = await response.text().catch(() => "");
            const errored: Board = {
                ...board,
                nodes: board.nodes.map((n) =>
                    n.id === nodeId
                        ? {
                              ...transition(
                                  n,
                                  "blocked",
                                  response.status === 401
                                      ? "No model key configured."
                                      : `HTTP ${response.status}`,
                              ),
                              lastError:
                                  errText ||
                                  `HTTP ${response.status}`,
                          }
                        : n,
                ),
            };
            return {
                nextBoard: errored,
                success: false,
                log: `${node.title} failed — HTTP ${response.status}.`,
                output: "",
                httpStatus,
            };
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error("Stream had no readable body.");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        outer: while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data:")) continue;

                const dataStr = trimmed.slice(5).trim();
                if (dataStr === "[DONE]") continue;

                let data: {
                    type?: string;
                    text?: string;
                    model?: string;
                    playbookSlug?: string;
                    chatId?: string;
                };
                try {
                    data = JSON.parse(dataStr);
                } catch {
                    continue;
                }

                // Backend assigns + emits the chat id on first turn of a new
                // thread (when client passes chat_id: undefined). Capture so
                // subsequent nodes thread into the same conversation.
                if (data.type === "chat_id" && typeof data.chatId === "string") {
                    capturedChatId = data.chatId;
                    continue;
                }

                if (data.type === "routing") {
                    if (typeof data.model === "string") model = data.model;
                    if (typeof data.playbookSlug === "string")
                        playbookSlug = data.playbookSlug;
                    continue;
                }

                if (data.type === "content_delta" && typeof data.text === "string") {
                    collected += data.text;
                    if (collected.length > MAX_OUTPUT_CHARS) {
                        collected = collected.slice(0, MAX_OUTPUT_CHARS);
                        options.onPartial?.(collected);
                        // Don't yank the connection — let the server finish,
                        // but stop appending once we've hit the cap.
                        continue;
                    }
                    options.onPartial?.(collected);
                    continue;
                }

                if (data.type === "content_done") {
                    // Stop reading; we've got the full text.
                    try {
                        reader.cancel();
                    } catch {
                        /* ignore */
                    }
                    break outer;
                }
            }
        }
    } catch (err) {
        // AbortError (user paused) — flip back to idle so it can be re-run.
        const isAbort =
            err instanceof DOMException && err.name === "AbortError";
        const reason =
            err instanceof Error ? err.message : "Unknown error";

        const errored: Board = {
            ...board,
            nodes: board.nodes.map((n) =>
                n.id === nodeId
                    ? isAbort
                        ? transition(n, "idle", "Run cancelled.")
                        : {
                              ...transition(n, "blocked", reason),
                              lastError: reason,
                          }
                    : n,
            ),
        };
        return {
            nextBoard: errored,
            success: false,
            log: isAbort
                ? `${node.title} cancelled.`
                : `${node.title} failed — ${reason}.`,
            output: "",
            httpStatus,
        };
    }

    const finalText = collected.trim();

    // Thread accumulator: append both the user turn we sent AND the
    // assistant turn we got, tagged with the node id, so the inspector can
    // surface the conversation per-node and the next node's prompt
    // automatically inherits this context.
    const lastUserTurn = messages[messages.length - 1];
    const updatedRunMessages: BoardChatMessage[] = [
        ...priorMessages,
        {
            role: "user",
            content: lastUserTurn?.content ?? promptForNode(node, board),
            nodeId,
        },
        {
            role: "assistant",
            content: finalText,
            nodeId,
        },
    ];

    const completed: Board = {
        ...board,
        chatId: capturedChatId ?? board.chatId,
        runMessages: updatedRunMessages,
        nodes: board.nodes.map((n) =>
            n.id === nodeId
                ? {
                      ...transition(n, "done"),
                      lastOutput: finalText,
                      lastSkillIds: n.skills,
                      lastModel: model,
                      lastPlaybookSlug: playbookSlug,
                      lastRunAt: new Date().toISOString(),
                      lastError: undefined,
                  }
                : n,
        ),
    };

    const trail = model ? ` (${model})` : "";
    return {
        nextBoard: completed,
        success: true,
        log: `${node.title} done${trail}.`,
        output: finalText,
        model,
        playbookSlug,
        httpStatus,
    };
}

/** Approve a gate — the gate goes `done` and downstream nodes can run. */
export function approveGate(board: Board, nodeId: string): AdvanceResult {
    const node = board.nodes.find((n) => n.id === nodeId)!;
    if (node.kind !== "gate") {
        return { nextBoard: board, done: false };
    }
    const done = transition(node, "done", "Approved by reviewer.");
    return {
        nextBoard: {
            ...board,
            nodes: board.nodes.map((n) => (n.id === nodeId ? done : n)),
        },
        log: `${node.title} approved.`,
        done: false,
    };
}

/**
 * Reject a gate — the gate goes `rejected`, and every transitively
 * reachable downstream node is marked `blocked` with the same reason.
 */
export function rejectGate(
    board: Board,
    nodeId: string,
    reason: string,
): AdvanceResult {
    const node = board.nodes.find((n) => n.id === nodeId)!;
    if (node.kind !== "gate") {
        return { nextBoard: board, done: false };
    }
    const blocked = new Set<string>();
    const queue = [...successorsOf(board, nodeId)];
    while (queue.length) {
        const id = queue.shift()!;
        if (blocked.has(id)) continue;
        blocked.add(id);
        queue.push(...successorsOf(board, id));
    }

    const updatedNodes = board.nodes.map((n) => {
        if (n.id === nodeId) {
            return transition(n, "rejected", reason);
        }
        if (blocked.has(n.id) && n.status !== "done") {
            return transition(n, "blocked", `Upstream gate rejected: ${reason}`);
        }
        return n;
    });

    return {
        nextBoard: { ...board, nodes: updatedNodes },
        log: `${node.title} rejected — ${blocked.size} downstream step${
            blocked.size === 1 ? "" : "s"
        } blocked.`,
        done: false,
    };
}

/**
 * Drop the threaded conversation state. Call when the user resets the
 * board, re-seeds from a template, or wants a fresh run untainted by
 * prior outputs. Keeps the node graph; clears the chat thread + messages.
 */
export function resetRunThread(board: Board): Board {
    return {
        ...board,
        chatId: undefined,
        runMessages: undefined,
    };
}

/** True when no node can make further progress without user input. */
export function isStalled(board: Board): boolean {
    for (const n of board.nodes) {
        if (n.status === "running") return false;
        if (n.status === "idle") {
            const preds = predecessorsOf(board, n.id);
            if (preds.every((p) => statusOf(board, p) === "done")) return false;
        }
    }
    return true;
}
