/**
 * Drafting Board persistence — localStorage only for now.
 *
 * Key: `louis.drafting-board.<templateKey>`
 *
 * TODO (server-side): POST /api/drafting-boards on every dirty save. The
 * stub is captured in docs/DRAFTING_BOARD.md so the backend team can wire
 * the same JSON payload up against the project_meta or matters table.
 */

import type { Board } from "./types";

const KEY_PREFIX = "louis.drafting-board.";

export function storageKey(templateKey: string): string {
    return `${KEY_PREFIX}${templateKey}`;
}

export function loadBoard(templateKey: string): Board | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(storageKey(templateKey));
        if (!raw) return null;
        return JSON.parse(raw) as Board;
    } catch {
        return null;
    }
}

export function saveBoard(board: Board): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            storageKey(board.templateKey),
            JSON.stringify(board),
        );
    } catch {
        // localStorage may be disabled (private mode, quota) — fail silently.
    }
}

export function clearBoard(templateKey: string): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(storageKey(templateKey));
    } catch {
        // ignore
    }
}
