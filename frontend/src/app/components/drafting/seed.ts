/**
 * Convert a TemplateSeed into a fresh Board (idle status, empty history).
 *
 * Kept separate from templates.ts so the seed records stay declarative
 * and the runtime-only fields (history, transitions) get filled in here.
 */

import type { Board, BoardNode, TemplateSeed } from "./types";
import { TEMPLATES, findTemplate } from "./templates";

export function seedBoard(template: TemplateSeed): Board {
    const nodes: BoardNode[] = template.nodes.map((n) => ({
        ...n,
        history: [],
    }));
    return {
        templateKey: template.key,
        name: template.label,
        nodes,
        edges: template.edges,
    };
}

export function seedBoardByKey(key: string): Board | null {
    const t = findTemplate(key);
    if (!t) return null;
    return seedBoard(t);
}

export { TEMPLATES };
