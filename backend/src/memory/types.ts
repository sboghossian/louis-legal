/**
 * Public types for the four-tier working-memory store (Processor v2, AC3).
 *
 * Modelled on Lavern's tiered memory + feedback loop (Apache-2.0,
 * AnttiHero/lavern @ v0.15.0: `src/mcp/tools/memory-system.ts`,
 * `precedent-board.ts`, `feedback-loop.ts`), reshaped into a single typed store
 * with a swappable persistence seam. The MCP-tool wiring and per-client JSON
 * files are intentionally dropped; the core ideas preserved are: four tiers,
 * tag-filtered retrieval, and effectiveness/recency-weighted ranking so injected
 * memory is *earned*, not bloated.
 *
 * Deliberately self-contained: no imports from other app modules, no network,
 * no LLM — so it can be unit-tested in isolation and later backed by Supabase
 * without touching call sites.
 */

/**
 * The four working-memory tiers (Lens B of docs/LAVERN_INSPIRATION.md):
 * - `session`       — current-run scratch state (scoped to a session id).
 * - `matter`        — per-matter context that persists across runs.
 * - `institutional` — cross-session firm rules / lessons / warnings (LEGAL.md).
 * - `precedent`     — reusable transformation patterns that promote and decay.
 */
export type MemoryTier = "session" | "matter" | "institutional" | "precedent";

/** Promotion state for the `precedent` tier. */
export type PrecedentStatus = "tentative" | "confirmed";

/** Outcome signal fed back after a memory was used in a turn. */
export type Outcome = "helped" | "unhelpful";

/**
 * Retrieval tags. A tag left `undefined` on an entry means "applies broadly"
 * and matches any query value for that key (see {@link MemoryQuery}).
 */
export interface MemoryTags {
  practiceArea?: string;
  jurisdiction?: string;
  docType?: string;
}

/** All filterable tag keys, in a stable order. */
export const TAG_KEYS = ["practiceArea", "jurisdiction", "docType"] as const;

/** Input to {@link MemoryStore.put}. Defaults are filled by the store. */
export interface MemoryInput {
  /** Owner of this memory. Required — the store is per-user isolated. */
  userId: string;
  tier: MemoryTier;
  content: string;
  tags?: MemoryTags;
  /** Session id (session tier), matter id (matter tier), client id (precedent). */
  scopeId?: string;
  /** Initial precedent status; ignored for other tiers. Defaults to "tentative". */
  status?: PrecedentStatus;
  /** ISO timestamp override for deterministic tests. Defaults to now. */
  now?: string;
}

/** A stored memory with its feedback/decay bookkeeping. */
export interface MemoryEntry {
  id: string;
  /** Owner of this memory. Every read is filtered to the querying user. */
  userId: string;
  tier: MemoryTier;
  content: string;
  tags: MemoryTags;
  scopeId?: string;
  /** Times a turn marked this memory as having helped. */
  helpfulCount: number;
  /** Times a turn marked this memory as useless. */
  unhelpfulCount: number;
  /** Total times this memory has been injected/used. */
  usageCount: number;
  /** Precedent promotion state (precedent tier only). */
  status?: PrecedentStatus;
  createdAt: string;
  updatedAt: string;
  /** Drives staleness decay; advanced by {@link MemoryStore.recordUsage}. */
  lastUsedAt: string;
}

/** Filter + ranking parameters for {@link MemoryStore.query}. */
export interface MemoryQuery {
  /** Owner whose memory to read. Required — no cross-user reads. */
  userId: string;
  /** Restrict to one tier. Omit to search all tiers. */
  tier?: MemoryTier;
  /** Exact-match scope (session/matter/client id). */
  scopeId?: string;
  /**
   * Tag filter. For each key present here, an entry passes if its own value is
   * `undefined` (broadly-applicable) OR equals the requested value.
   */
  tags?: MemoryTags;
  /** Max entries returned, highest-ranked first. */
  limit?: number;
  /** ISO "now" for deterministic recency scoring. Defaults to current time. */
  now?: string;
}

/**
 * Persistence-agnostic memory store. The in-memory implementation ships now;
 * a Supabase-backed implementation can satisfy the same interface later without
 * changing call sites. See {@link InMemoryMemoryStore}.
 */
export interface MemoryStore {
  /** Write a new memory; returns the materialised entry. */
  put(input: MemoryInput): MemoryEntry;
  /** Read one entry by id. */
  get(id: string): MemoryEntry | undefined;
  /** Tag-filtered, effectiveness/recency-ranked retrieval (user-scoped). */
  query(q: MemoryQuery): MemoryEntry[];
  /** Record helpful/unhelpful feedback; bumps the effectiveness signal. */
  recordOutcome(id: string, outcome: Outcome, now?: string): MemoryEntry | undefined;
  /** Mark an entry as used this turn (usageCount++, refreshes recency). */
  recordUsage(id: string, now?: string): MemoryEntry | undefined;
  /**
   * Reinforce a precedent on recurrence: usage++ + helpful++ + recency refresh,
   * and promote `tentative → confirmed` once it crosses the promotion threshold.
   */
  reinforce(id: string, now?: string): MemoryEntry | undefined;
  /** Drop everything (test/reset helper). */
  clear(): void;
}
