/**
 * Shared types for the Drafting Board node-graph editor.
 *
 * A board is a directed acyclic graph of "lanes" running top-to-bottom:
 *   Input  →  Agent step  →  Human gate  →  Output
 *
 * Every node carries a status that drives both color and animation; the
 * runner walks idle nodes topologically and animates the path from one
 * lane to the next.
 */

export type NodeKind = "input" | "agent" | "gate" | "output" | "branch";

export type NodeStatus =
    | "idle"
    | "running"
    | "done"
    | "blocked"
    | "needs_approval"
    | "rejected";

export type Lane = "input" | "agent" | "gate" | "output";

export interface StatusTransition {
    at: number; // epoch ms
    from: NodeStatus;
    to: NodeStatus;
    note?: string;
}

export interface BoardNode {
    id: string;
    kind: NodeKind;
    title: string;
    subtitle: string;
    /** Lane the node belongs to. Used by auto-layout. */
    lane: Lane;
    status: NodeStatus;
    /** Skill slugs (e.g. "draft.NDA-mutual") this step is wired to fire. */
    skills: string[];
    /** Inputs this node consumes — free-form labels surfaced in the inspector. */
    inputs: string[];
    /** Outputs this node produces — free-form labels surfaced in the inspector. */
    outputs: string[];
    /** Approval prompt for `gate` nodes. */
    approvalQuestion?: string;
    /** Approver role for `gate` nodes. */
    approver?: string;
    /** History of status changes, newest last. */
    history: StatusTransition[];
    /** Optional reason — populated when a node enters blocked/rejected. */
    reason?: string;
    /** Plain-text output captured the last time the node ran a real skill. */
    lastOutput?: string;
    /** Skill slugs that fired during the last run (best-effort, may be empty). */
    lastSkillIds?: string[];
    /** Model the router picked for the last run (from SSE `routing` event). */
    lastModel?: string;
    /** Playbook slug the router loaded for the last run. */
    lastPlaybookSlug?: string;
    /** ISO timestamp of the last successful run. */
    lastRunAt?: string;
    /** Last error message if the most recent run failed. */
    lastError?: string;
}

/** Edge: directional from → to. */
export interface BoardEdge {
    from: string;
    to: string;
}

/**
 * One turn in the board's threaded conversation. We snapshot the messages
 * locally so node N+1 can see node N's output as a prior assistant turn —
 * the model treats the whole run as a single conversation.
 */
export interface BoardChatMessage {
    role: "user" | "assistant";
    content: string;
    /** Which node produced this message — surfaced in the inspector. */
    nodeId?: string;
}

export interface Board {
    templateKey: string;
    name: string;
    nodes: BoardNode[];
    edges: BoardEdge[];
    /**
     * Chat-thread id the board's nodes share. First node-run creates a fresh
     * chat (chatId stays `undefined`); the SSE response returns `chat_id`,
     * which we save here so subsequent nodes continue the same conversation.
     * The thread shows up in /all-chats as a single run-history entry.
     */
    chatId?: string;
    /**
     * Accumulated user/assistant messages across the run. Each completed node
     * appends its user prompt + the model's reply so the next node sees full
     * context. Reset when the board is re-seeded.
     */
    runMessages?: BoardChatMessage[];
}

/** Computed position from auto-layout — kept separate from node data. */
export interface NodePosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type LayoutMap = Record<string, NodePosition>;

export interface TemplateSeed {
    key: string;
    label: string;
    blurb: string;
    nodes: Omit<BoardNode, "history">[];
    edges: BoardEdge[];
}
