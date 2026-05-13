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
const TIMESTAMP_KEY = "louis.drafting-board.__lastSavedAt__";

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
        // Track per-template last-saved timestamps so we can pick the
        // most-recently-touched board on a return visit.
        const stamps = readTimestamps();
        stamps[board.templateKey] = Date.now();
        window.localStorage.setItem(TIMESTAMP_KEY, JSON.stringify(stamps));
    } catch {
        // localStorage may be disabled (private mode, quota) — fail silently.
    }
}

export function clearBoard(templateKey: string): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.removeItem(storageKey(templateKey));
        const stamps = readTimestamps();
        delete stamps[templateKey];
        window.localStorage.setItem(TIMESTAMP_KEY, JSON.stringify(stamps));
    } catch {
        // ignore
    }
}

function readTimestamps(): Record<string, number> {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(TIMESTAMP_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

/**
 * Return every templateKey that has a board persisted under the
 * `louis.drafting-board.*` namespace. Skips the timestamp index key.
 */
export function listSavedTemplateKeys(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (!k) continue;
            if (!k.startsWith(KEY_PREFIX)) continue;
            if (k === TIMESTAMP_KEY) continue;
            keys.push(k.slice(KEY_PREFIX.length));
        }
        return keys;
    } catch {
        return [];
    }
}

/**
 * Pick the templateKey with the newest save timestamp. If timestamps are
 * missing (e.g. boards saved before this helper existed), fall back to the
 * first key we find — better than nothing for return-visit UX.
 */
export function pickMostRecentTemplateKey(): string | null {
    const keys = listSavedTemplateKeys();
    if (keys.length === 0) return null;
    const stamps = readTimestamps();
    let best: { key: string; at: number } | null = null;
    for (const k of keys) {
        const at = stamps[k] ?? 0;
        if (!best || at > best.at) best = { key: k, at };
    }
    return best ? best.key : keys[0];
}
