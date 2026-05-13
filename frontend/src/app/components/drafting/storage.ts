/**
 * Drafting Board persistence.
 *
 * Boards live in two places now:
 *  - localStorage (synchronous, survives offline / lets us hydrate the
 *    canvas before the network round-trip lands)
 *  - Supabase via /api/drafting-boards (canonical — roams across
 *    devices, survives a cache clear)
 *
 * Reads prefer the local cache; saves write through to both. The server
 * call is fire-and-forget — failing offline doesn't lose the user's
 * work, the next online save replays the latest payload.
 *
 * Key: `louis.drafting-board.<templateKey>`
 */

import type { Board } from "./types";
import { getAuthHeader } from "@/app/lib/louisApi";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
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

// Pull the latest payload from the server when one exists and merge it
// into localStorage. Called by the page on mount so cross-device users
// see their boards even on a fresh browser. Returns the freshest board
// it could resolve (server > local > null).
export async function hydrateBoardFromServer(
    templateKey: string,
): Promise<Board | null> {
    if (typeof window === "undefined") return null;
    try {
        const auth = await getAuthHeader();
        if (!auth.Authorization) return loadBoard(templateKey);
        const r = await fetch(
            `${API_BASE}/api/drafting-boards/${encodeURIComponent(templateKey)}`,
            { headers: auth, cache: "no-store" },
        );
        if (r.status === 404) return loadBoard(templateKey);
        if (!r.ok) return loadBoard(templateKey);
        const json = (await r.json()) as { payload?: Board };
        if (!json.payload) return loadBoard(templateKey);
        // Mirror to localStorage so subsequent reads are synchronous and
        // we keep working offline.
        try {
            window.localStorage.setItem(
                storageKey(templateKey),
                JSON.stringify(json.payload),
            );
        } catch {
            /* ignore */
        }
        return json.payload;
    } catch {
        return loadBoard(templateKey);
    }
}

export function saveBoard(board: Board): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(
            storageKey(board.templateKey),
            JSON.stringify(board),
        );
        const stamps = readTimestamps();
        stamps[board.templateKey] = Date.now();
        window.localStorage.setItem(TIMESTAMP_KEY, JSON.stringify(stamps));
    } catch {
        // localStorage may be disabled (private mode, quota) — fail silently.
    }
    // Fire-and-forget server save. Debounced one layer up by the page
    // (BoardPersistence saves on `dirty` transitions, not keystroke).
    void persistToServer(board);
}

let inflight: Promise<void> | null = null;
let pending: Board | null = null;

async function persistToServer(board: Board): Promise<void> {
    pending = board;
    if (inflight) return;
    inflight = (async () => {
        // Drain the pending queue so back-to-back saves coalesce into
        // one network call.
        while (pending) {
            const snapshot = pending;
            pending = null;
            try {
                const auth = await getAuthHeader();
                if (!auth.Authorization) break;
                await fetch(`${API_BASE}/api/drafting-boards`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", ...auth },
                    body: JSON.stringify({
                        templateKey: snapshot.templateKey,
                        name: snapshot.name,
                        payload: snapshot,
                    }),
                });
            } catch {
                // Offline / 500 — leave the localStorage copy in place and
                // try again on the next save. We could implement explicit
                // retry-on-online but in practice the user saves often
                // enough that the next dirty save catches up.
                break;
            }
        }
    })().finally(() => {
        inflight = null;
    });
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
    void deleteFromServer(templateKey);
}

async function deleteFromServer(templateKey: string): Promise<void> {
    try {
        const auth = await getAuthHeader();
        if (!auth.Authorization) return;
        await fetch(
            `${API_BASE}/api/drafting-boards/${encodeURIComponent(templateKey)}`,
            { method: "DELETE", headers: auth },
        );
    } catch {
        /* offline — server will keep the row, user can purge later */
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
