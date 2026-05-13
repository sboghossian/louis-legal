/**
 * Auto-layout for the Drafting Board.
 *
 * Implements a small, in-house dagre-style layered layout (no external dep).
 * Algorithm:
 *   1. Compute longest-path rank per node from sources (input lane = rank 0).
 *      We bias the rank with each node's `lane` so that humans, agents, gates
 *      and outputs naturally stack into rows, but a long agent chain can
 *      still occupy multiple rows inside its lane.
 *   2. Inside each rank, order nodes by the median rank of their predecessors
 *      (Sugiyama-style barycenter heuristic) — this keeps edges from crossing.
 *   3. Assign x/y coordinates from rank + slot index.
 *
 * Output is a {nodeId -> {x, y, w, h}} map consumed by the canvas; edges
 * are drawn between center points with an orthogonal-ish bezier curve.
 *
 * Why no dagre dep: the user explicitly asked not to run npm install, and
 * for ~6-12 node graphs an in-house layered solver is plenty fast and
 * keeps the bundle lean. Swappable later for `dagre` or `elkjs` if the
 * graphs grow.
 */

import type { Board, BoardNode, LayoutMap, Lane } from "./types";

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 110;
const COL_GAP = 96;
const ROW_GAP = 64;
export const CANVAS_PADDING_X = 64;
export const CANVAS_PADDING_Y = 56;

const LANE_RANK: Record<Lane, number> = {
    input: 0,
    agent: 1,
    gate: 2,
    output: 3,
};

/**
 * Compute the layered layout for a board.
 *
 * Returns positions in *canvas* coordinates (top-left origin, pre-zoom).
 */
export function computeLayout(board: Board): {
    positions: LayoutMap;
    width: number;
    height: number;
} {
    if (board.nodes.length === 0) {
        return { positions: {}, width: 480, height: 320 };
    }

    // --- 1. Longest-path ranking, lane-biased ----------------------------------
    const incoming = new Map<string, string[]>();
    const outgoing = new Map<string, string[]>();
    for (const n of board.nodes) {
        incoming.set(n.id, []);
        outgoing.set(n.id, []);
    }
    for (const e of board.edges) {
        outgoing.get(e.from)?.push(e.to);
        incoming.get(e.to)?.push(e.from);
    }

    // Initial rank from lane + topological longest-path among predecessors.
    const rank = new Map<string, number>();
    const visit = (id: string, seen: Set<string>): number => {
        if (rank.has(id)) return rank.get(id)!;
        if (seen.has(id)) return 0; // cycle guard
        seen.add(id);
        const node = board.nodes.find((n) => n.id === id)!;
        const preds = incoming.get(id) ?? [];
        let r = LANE_RANK[node.lane];
        for (const p of preds) {
            r = Math.max(r, visit(p, seen) + 1);
        }
        rank.set(id, r);
        return r;
    };
    for (const n of board.nodes) visit(n.id, new Set());

    // --- 2. Group by rank, then order via barycenter of predecessors ------------
    const byRank = new Map<number, BoardNode[]>();
    for (const n of board.nodes) {
        const r = rank.get(n.id)!;
        if (!byRank.has(r)) byRank.set(r, []);
        byRank.get(r)!.push(n);
    }
    const ranksSorted = [...byRank.keys()].sort((a, b) => a - b);

    // First pass: stable order = order of appearance in `nodes` (keeps user-added
    // nodes near where they were declared).
    const orderInRank = new Map<string, number>();
    for (const r of ranksSorted) {
        byRank.get(r)!.forEach((n, idx) => orderInRank.set(n.id, idx));
    }

    // Barycenter sweep — top-down then bottom-up — to reduce edge crossings.
    for (let sweep = 0; sweep < 4; sweep++) {
        const order = sweep % 2 === 0 ? ranksSorted : [...ranksSorted].reverse();
        for (const r of order) {
            const row = byRank.get(r)!;
            row.sort((a, b) => bary(a) - bary(b));
            row.forEach((n, idx) => orderInRank.set(n.id, idx));
        }
    }
    function bary(n: BoardNode): number {
        const neighbors = [
            ...(incoming.get(n.id) ?? []),
            ...(outgoing.get(n.id) ?? []),
        ];
        if (neighbors.length === 0) return orderInRank.get(n.id) ?? 0;
        const s = neighbors.reduce(
            (acc, nid) => acc + (orderInRank.get(nid) ?? 0),
            0,
        );
        return s / neighbors.length;
    }

    // --- 3. Position assignment ------------------------------------------------
    const maxRowLen = Math.max(
        ...ranksSorted.map((r) => byRank.get(r)!.length),
    );

    const positions: LayoutMap = {};
    let maxX = 0;
    let maxY = 0;
    for (const r of ranksSorted) {
        const row = byRank.get(r)!;
        const rowLen = row.length;
        const rowWidth = rowLen * NODE_WIDTH + (rowLen - 1) * COL_GAP;
        const fullWidth =
            maxRowLen * NODE_WIDTH + (maxRowLen - 1) * COL_GAP;
        const xOffset = (fullWidth - rowWidth) / 2;

        row.forEach((n, idx) => {
            const x = CANVAS_PADDING_X + xOffset + idx * (NODE_WIDTH + COL_GAP);
            const y = CANVAS_PADDING_Y + r * (NODE_HEIGHT + ROW_GAP);
            positions[n.id] = {
                x,
                y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
            };
            maxX = Math.max(maxX, x + NODE_WIDTH);
            maxY = Math.max(maxY, y + NODE_HEIGHT);
        });
    }

    return {
        positions,
        width: maxX + CANVAS_PADDING_X,
        height: maxY + CANVAS_PADDING_Y,
    };
}

/**
 * Build a smooth SVG path between two nodes, anchoring at the bottom of
 * the source and the top of the target.
 */
export function edgePath(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
): string {
    const x1 = a.x + a.width / 2;
    const y1 = a.y + a.height;
    const x2 = b.x + b.width / 2;
    const y2 = b.y;
    const dy = Math.max(40, (y2 - y1) / 2);
    return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;
}
