/**
 * Supabase-backed {@link MemoryStore} (Processor v2 — persistent memory).
 *
 * Same contract as {@link InMemoryMemoryStore}, but rows live in the
 * `memory_entries` table so memory survives restarts and is shared across
 * instances. Tag-wildcard matching and effectiveness/recency ranking are done
 * in-process (reusing `matchesTags` + `rankEntries`) after a user-scoped fetch —
 * per-user memory is small, and this keeps ranking identical to the in-memory
 * path. Counter updates are read-modify-write (acceptable at current scale; swap
 * for an atomic RPC if contention shows up).
 *
 * Migration: `backend/migrations/2026-05-22-memory-entries.sql`.
 */

import crypto from "crypto";

import { createServerSupabase } from "../lib/supabase";
import { rankEntries } from "./ranking";
import { matchesTags, PROMOTION_THRESHOLD } from "./store";
import type {
  MemoryEntry,
  MemoryInput,
  MemoryQuery,
  MemoryStore,
  Outcome,
  PrecedentStatus,
  MemoryTier,
} from "./types";

const TABLE = "memory_entries";

/**
 * Safety cap on rows fetched per query. Per-user memory is expected to stay
 * small; this prevents a user who accumulates thousands of session memories from
 * silently making every turn slow. Ranking is applied in-process after the
 * fetch, so this is a guard, not a correctness boundary.
 */
const MAX_QUERY_ROWS = 500;

/** Database row shape for `memory_entries` (snake_case columns). */
export interface MemoryRow {
  id: string;
  user_id: string;
  tier: string;
  content: string;
  scope_id: string | null;
  practice_area: string | null;
  jurisdiction: string | null;
  doc_type: string | null;
  helpful_count: number;
  unhelpful_count: number;
  usage_count: number;
  status: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string;
}

/** Pure: DB row → domain entry. Null tag columns become absent tags. */
export function rowToEntry(row: MemoryRow): MemoryEntry {
  const tags: MemoryEntry["tags"] = {};
  if (row.practice_area != null) tags.practiceArea = row.practice_area;
  if (row.jurisdiction != null) tags.jurisdiction = row.jurisdiction;
  if (row.doc_type != null) tags.docType = row.doc_type;
  const entry: MemoryEntry = {
    id: row.id,
    userId: row.user_id,
    tier: row.tier as MemoryTier,
    content: row.content,
    tags,
    helpfulCount: row.helpful_count,
    unhelpfulCount: row.unhelpful_count,
    usageCount: row.usage_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  };
  if (row.scope_id != null) entry.scopeId = row.scope_id;
  if (row.status != null) entry.status = row.status as PrecedentStatus;
  return entry;
}

/** Pure: domain entry → DB row. Absent tags become null columns. */
export function entryToRow(entry: MemoryEntry): MemoryRow {
  return {
    id: entry.id,
    user_id: entry.userId,
    tier: entry.tier,
    content: entry.content,
    scope_id: entry.scopeId ?? null,
    practice_area: entry.tags.practiceArea ?? null,
    jurisdiction: entry.tags.jurisdiction ?? null,
    doc_type: entry.tags.docType ?? null,
    helpful_count: entry.helpfulCount,
    unhelpful_count: entry.unhelpfulCount,
    usage_count: entry.usageCount,
    status: entry.status ?? null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    last_used_at: entry.lastUsedAt,
  };
}

export class SupabaseMemoryStore implements MemoryStore {
  constructor(private readonly db: ReturnType<typeof createServerSupabase>) {}

  async put(input: MemoryInput): Promise<MemoryEntry> {
    const now = input.now ?? new Date().toISOString();
    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      userId: input.userId,
      tier: input.tier,
      content: input.content,
      tags: { ...(input.tags ?? {}) },
      helpfulCount: 0,
      unhelpfulCount: 0,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    };
    if (input.scopeId !== undefined) entry.scopeId = input.scopeId;
    const status = input.tier === "precedent" ? input.status ?? "tentative" : input.status;
    if (status !== undefined) entry.status = status;

    const { error } = await this.db.from(TABLE).insert(entryToRow(entry));
    if (error) throw new Error(`memory put failed: ${error.message}`);
    return entry;
  }

  async get(id: string): Promise<MemoryEntry | undefined> {
    const { data, error } = await this.db.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`memory get failed: ${error.message}`);
    return data ? rowToEntry(data as MemoryRow) : undefined;
  }

  async query(q: MemoryQuery): Promise<MemoryEntry[]> {
    let builder = this.db.from(TABLE).select("*").eq("user_id", q.userId);
    if (q.tier) builder = builder.eq("tier", q.tier);
    if (q.scopeId !== undefined) builder = builder.eq("scope_id", q.scopeId);
    builder = builder.limit(MAX_QUERY_ROWS);
    const { data, error } = await builder;
    if (error) throw new Error(`memory query failed: ${error.message}`);

    const now = q.now ? Date.parse(q.now) : Date.now();
    const entries = ((data ?? []) as MemoryRow[]).map(rowToEntry).filter((e) => matchesTags(e, q.tags));
    const ranked = rankEntries(entries, now);
    return q.limit !== undefined ? ranked.slice(0, Math.max(0, q.limit)) : ranked;
  }

  /**
   * Read-modify-write a single entry. NOTE: this is NOT atomic — two concurrent
   * writes to the same row will lose-update (the second full-row UPDATE clobbers
   * the first). Fine while the in-memory store is the default and Supabase is
   * opt-in, but BEFORE enabling Supabase memory in production, replace the
   * counter mutations with atomic Postgres increments via an RPC, e.g.:
   *   UPDATE memory_entries SET usage_count = usage_count + 1, ... WHERE id=$1.
   */
  private async mutate(
    id: string,
    apply: (e: MemoryEntry) => void,
  ): Promise<MemoryEntry | undefined> {
    const entry = await this.get(id);
    if (!entry) return undefined;
    apply(entry);
    const row = entryToRow(entry);
    const { error } = await this.db.from(TABLE).update(row).eq("id", id);
    if (error) throw new Error(`memory update failed: ${error.message}`);
    return entry;
  }

  async recordOutcome(id: string, outcome: Outcome, now?: string): Promise<MemoryEntry | undefined> {
    return this.mutate(id, (e) => {
      if (outcome === "helped") e.helpfulCount += 1;
      else e.unhelpfulCount += 1;
      e.updatedAt = now ?? new Date().toISOString();
    });
  }

  async recordUsage(id: string, now?: string): Promise<MemoryEntry | undefined> {
    const ts = now ?? new Date().toISOString();
    return this.mutate(id, (e) => {
      e.usageCount += 1;
      e.lastUsedAt = ts;
      e.updatedAt = ts;
    });
  }

  async reinforce(id: string, now?: string): Promise<MemoryEntry | undefined> {
    const ts = now ?? new Date().toISOString();
    return this.mutate(id, (e) => {
      e.usageCount += 1;
      e.helpfulCount += 1;
      e.lastUsedAt = ts;
      e.updatedAt = ts;
      if (
        e.tier === "precedent" &&
        e.status === "tentative" &&
        e.helpfulCount >= PROMOTION_THRESHOLD
      ) {
        e.status = "confirmed";
      }
    });
  }

  async clear(): Promise<void> {
    // Destructive: deletes EVERY row (all users). Test/reset only — never wire
    // this to a user action. Hard-blocked outside tests so a misrouted call
    // can't wipe production memory.
    if (process.env.NODE_ENV === "production") {
      throw new Error("SupabaseMemoryStore.clear() is disabled in production");
    }
    const { error } = await this.db.from(TABLE).delete().neq("id", "");
    if (error) throw new Error(`memory clear failed: ${error.message}`);
  }
}
