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
}

/** Edge: directional from → to. */
export interface BoardEdge {
    from: string;
    to: string;
}

export interface Board {
    templateKey: string;
    name: string;
    nodes: BoardNode[];
    edges: BoardEdge[];
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
