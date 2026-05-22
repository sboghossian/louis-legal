/**
 * Four-tier working-memory store — in-memory implementation (Processor v2, AC3).
 *
 * Implements {@link MemoryStore}: Session / Matter / Institutional / Precedent
 * tiers, tag-filtered retrieval, and effectiveness/recency-weighted ranking.
 * State lives in a process-local Map; the persistence seam is the interface, so
 * a Supabase-backed store can drop in later without changing call sites.
 *
 * Future SQL (for Supabase migration when permitted):
 *
 * CREATE TABLE memory_entries (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tier text NOT NULL,                 -- 'session'|'matter'|'institutional'|'precedent'
 *   content text NOT NULL,
 *   scope_id text,                      -- session/matter/client id
 *   practice_area text,
 *   jurisdiction text,
 *   doc_type text,
 *   helpful_count int NOT NULL DEFAULT 0,
 *   unhelpful_count int NOT NULL DEFAULT 0,
 *   usage_count int NOT NULL DEFAULT 0,
 *   status text,                        -- precedent only: 'tentative'|'confirmed'
 *   created_at timestamptz NOT NULL DEFAULT now(),
 *   updated_at timestamptz NOT NULL DEFAULT now(),
 *   last_used_at timestamptz NOT NULL DEFAULT now()
 * );
 * CREATE INDEX memory_entries_tier_idx ON memory_entries (tier);
 * CREATE INDEX memory_entries_scope_idx ON memory_entries (scope_id);
 */

import crypto from "crypto";

import { rankEntries } from "./ranking";
import { TAG_KEYS } from "./types";
import type {
  MemoryEntry,
  MemoryInput,
  MemoryQuery,
  MemoryStore,
  Outcome,
} from "./types";

/** Recurrence count at which a `tentative` precedent is promoted to `confirmed`. */
export const PROMOTION_THRESHOLD = 3;

/**
 * True if `entry` passes `filter`. For each filter key with a defined value, the
 * entry matches when its own tag is `undefined` (broadly-applicable) OR equals
 * the requested value. Keys absent from the filter are ignored.
 */
function matchesTags(entry: MemoryEntry, filter: MemoryQuery["tags"]): boolean {
  if (!filter) return true;
  for (const key of TAG_KEYS) {
    const wanted = filter[key];
    if (wanted === undefined) continue;
    const have = entry.tags[key];
    if (have !== undefined && have !== wanted) return false;
  }
  return true;
}

export class InMemoryMemoryStore implements MemoryStore {
  private readonly entries = new Map<string, MemoryEntry>();

  put(input: MemoryInput): MemoryEntry {
    const now = input.now ?? new Date().toISOString();
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      userId: input.userId,
      tier: input.tier,
      content: input.content,
      tags: { ...(input.tags ?? {}) },
      scopeId: input.scopeId,
      helpfulCount: 0,
      unhelpfulCount: 0,
      usageCount: 0,
      status: input.tier === "precedent" ? input.status ?? "tentative" : input.status,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  get(id: string): MemoryEntry | undefined {
    return this.entries.get(id);
  }

  query(q: MemoryQuery): MemoryEntry[] {
    const now = q.now ? Date.parse(q.now) : Date.now();
    const filtered = [...this.entries.values()].filter((e) => {
      if (e.userId !== q.userId) return false; // per-user isolation, all tiers
      if (q.tier && e.tier !== q.tier) return false;
      if (q.scopeId !== undefined && e.scopeId !== q.scopeId) return false;
      return matchesTags(e, q.tags);
    });
    const ranked = rankEntries(filtered, now);
    return q.limit !== undefined ? ranked.slice(0, Math.max(0, q.limit)) : ranked;
  }

  recordOutcome(id: string, outcome: Outcome, now?: string): MemoryEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    if (outcome === "helped") entry.helpfulCount += 1;
    else entry.unhelpfulCount += 1;
    entry.updatedAt = now ?? new Date().toISOString();
    return entry;
  }

  recordUsage(id: string, now?: string): MemoryEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    const ts = now ?? new Date().toISOString();
    entry.usageCount += 1;
    entry.lastUsedAt = ts;
    entry.updatedAt = ts;
    return entry;
  }

  reinforce(id: string, now?: string): MemoryEntry | undefined {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    const ts = now ?? new Date().toISOString();
    entry.usageCount += 1;
    entry.helpfulCount += 1;
    entry.lastUsedAt = ts;
    entry.updatedAt = ts;
    if (
      entry.tier === "precedent" &&
      entry.status === "tentative" &&
      entry.helpfulCount >= PROMOTION_THRESHOLD
    ) {
      entry.status = "confirmed";
    }
    return entry;
  }

  clear(): void {
    this.entries.clear();
  }
}

/** Process-wide default store. Swap for a Supabase-backed store in production. */
export const memoryStore: MemoryStore = new InMemoryMemoryStore();
