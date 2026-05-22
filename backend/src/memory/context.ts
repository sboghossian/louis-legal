/**
 * Turn-time helpers that put the four-tier memory store to work (Processor v2,
 * "memory goes live"). Pure functions over a {@link MemoryStore} — no I/O of
 * their own — so the chat handler can inject earned memory into a turn and
 * capture the turn back, while staying unit-testable in isolation.
 */

import { rankEntries } from "./ranking";
import type { MemoryEntry, MemoryStore, MemoryTags } from "./types";

/** How many entries to inject per turn by default. */
export const DEFAULT_CONTEXT_LIMIT = 8;

/** Max characters of a captured turn memory. */
export const MAX_MEMORY_CHARS = 600;

export interface MemoryContextQuery {
  /** Tags from the turn's routing decision (practice area, jurisdiction). */
  tags?: MemoryTags;
  /** Matter/project scope id — gates the `matter` tier. */
  matterId?: string;
  /** Session/chat scope id — gates the `session` tier. */
  sessionId?: string;
  /** Max entries injected. Defaults to {@link DEFAULT_CONTEXT_LIMIT}. */
  limit?: number;
  /** ISO "now" for deterministic recency scoring. Defaults to current time. */
  now?: string;
}

export interface MemoryContextResult {
  /** Formatted "Working memory" system-prompt block, or "" when nothing earned. */
  block: string;
  /** The entries actually injected — pass these to `recordUsage` after the turn. */
  entries: MemoryEntry[];
}

/**
 * Assemble the working-memory block for a turn.
 *
 * Cross-session tiers (`institutional`, `precedent`) are always eligible;
 * scoped tiers (`matter`, `session`) only when their scope id is supplied. All
 * are tag-filtered by the query tags, merged (de-duped), re-ranked by
 * effectiveness×recency, and capped at `limit`. Returns an empty block when no
 * memory has earned its place — the caller appends nothing in that case.
 */
export function buildMemoryContext(
  store: MemoryStore,
  q: MemoryContextQuery = {},
): MemoryContextResult {
  const limit = q.limit ?? DEFAULT_CONTEXT_LIMIT;
  const seen = new Set<string>();
  const pool: MemoryEntry[] = [];
  const add = (entries: MemoryEntry[]) => {
    for (const e of entries) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        pool.push(e);
      }
    }
  };

  add(store.query({ tier: "institutional", tags: q.tags, now: q.now }));
  add(store.query({ tier: "precedent", tags: q.tags, now: q.now }));
  if (q.matterId) {
    add(store.query({ tier: "matter", scopeId: q.matterId, tags: q.tags, now: q.now }));
  }
  if (q.sessionId) {
    add(store.query({ tier: "session", scopeId: q.sessionId, tags: q.tags, now: q.now }));
  }

  const now = q.now ? Date.parse(q.now) : Date.now();
  const ranked = rankEntries(pool, now).slice(0, Math.max(0, limit));
  if (ranked.length === 0) return { block: "", entries: [] };

  const lines = ranked.map((e) => `- [${e.tier}] ${e.content}`);
  const block = `\n\n## Working memory\nContext Louis has retained for this matter (most useful first):\n${lines.join(
    "\n",
  )}`;
  return { block, entries: ranked };
}

/**
 * Condense one user→assistant exchange into a bounded memory string, or `null`
 * for an empty/trivial turn (nothing worth retaining). Length-capped so the
 * store never accumulates whole transcripts.
 */
export function summarizeTurnForMemory(input: {
  userMessage: string;
  assistantText: string;
}): string | null {
  const ask = (input.userMessage ?? "").trim();
  const ans = (input.assistantText ?? "").trim();
  if (!ask || !ans) return null;

  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
  const content = `Asked: ${clip(ask, 200)}\nAnswered: ${clip(ans, 360)}`;
  return clip(content, MAX_MEMORY_CHARS);
}
