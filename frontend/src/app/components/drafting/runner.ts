/**
 * Graph-walking runner for the Drafting Board.
 *
 * Pure functions — no React. The page wraps these with `setBoard(...)` to
 * apply transitions and animate the canvas.
 *
 * Algorithm: Kahn's topological order, with three rules:
 *   1. A node is "ready" when all its inbound edges come from `done` nodes.
 *   2. `gate` nodes never auto-advance; when they become ready they switch
 *      to `needs_approval` and the runner pauses until the user clicks
 *      Approve / Reject in the inspector.
 *   3. `agent` and `output` nodes simulate work: idle → running for
 *      1.5–3 s → done. The skill IDs already on the node are echoed so
 *      the user sees which playbooks "fired".
 */

import type { Board, BoardNode, NodeStatus, StatusTransition } from "./types";

export interface AdvanceResult {
    nextBoard: Board;
    /** Plain-prose event the page can append to its timeline. */
    log?: string;
    /** Whether the runner thinks the graph is now done or paused. */
    done: boolean;
}

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
 * Start running a candidate node. Returns the board with the node flipped
 * to running and a recommended dwell time (ms) for the page to wait
 * before calling `completeNode`.
 */
export function startNode(
    board: Board,
    nodeId: string,
): { nextBoard: Board; dwellMs: number; log: string } {
    const node = board.nodes.find((n) => n.id === nodeId)!;
    const next = transition(node, "running");
    const dwellMs = 1500 + Math.floor(Math.random() * 1500); // 1.5–3s
    const skillTrail =
        node.skills.length > 0
            ? ` (firing ${node.skills.join(", ")})`
            : "";
    return {
        nextBoard: {
            ...board,
            nodes: board.nodes.map((n) => (n.id === nodeId ? next : n)),
        },
        dwellMs,
        log: `Running ${node.title}${skillTrail}.`,
    };
}

export function completeNode(board: Board, nodeId: string): AdvanceResult {
    const node = board.nodes.find((n) => n.id === nodeId)!;
    const done = transition(node, "done");
    const nextBoard: Board = {
        ...board,
        nodes: board.nodes.map((n) => (n.id === nodeId ? done : n)),
    };
    return {
        nextBoard,
        log: `${node.title} is done.`,
        done: false,
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
