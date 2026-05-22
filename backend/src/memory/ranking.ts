/**
 * Effectiveness + recency ranking for the memory store (Processor v2, AC3).
 *
 * Pure functions, no I/O. "Memory that demonstrably helped gets weighted up at
 * retrieval; useless or stale memory decays" (Lavern's feedback-loop idea,
 * Apache-2.0). The store calls {@link rankEntries} to order a filtered slice so
 * only the memory that has earned its place is injected into a turn.
 */

import type { MemoryEntry } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Laplace smoothing constant — a brand-new entry scores a neutral 0.5. */
const ALPHA = 1;

/** Default recency half-life: a memory unused for this long halves its weight. */
export const DEFAULT_HALF_LIFE_DAYS = 30;

/**
 * Smoothed helpfulness in (0, 1): `(helpful + α) / (helpful + unhelpful + 2α)`.
 * 0 helpful / 0 unhelpful → 0.5 (neutral); helpful dominates → →1; unhelpful → →0.
 */
export function effectivenessScore(entry: MemoryEntry): number {
  const h = Math.max(0, entry.helpfulCount);
  const u = Math.max(0, entry.unhelpfulCount);
  return (h + ALPHA) / (h + u + 2 * ALPHA);
}

/**
 * Recency weight in (0, 1]: exponential decay on time since `lastUsedAt`.
 * Fresh → 1; one half-life old → 0.5; future timestamps are clamped to 1.
 */
export function recencyWeight(
  entry: MemoryEntry,
  now: number,
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS,
): number {
  const ageDays = Math.max(0, (now - Date.parse(entry.lastUsedAt)) / DAY_MS);
  if (halfLifeDays <= 0) return 1;
  return Math.pow(2, -ageDays / halfLifeDays);
}

/**
 * Composite rank score: `effectiveness × recency`, in (0, 1].
 * Captures the AC3 contract directly — helped ↑, stale ↓.
 */
export function scoreEntry(
  entry: MemoryEntry,
  now: number,
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS,
): number {
  return effectivenessScore(entry) * recencyWeight(entry, now, halfLifeDays);
}

/**
 * Rank entries by composite score, highest first. Stable, deterministic
 * tie-break: more-recently-updated wins, then id, so equal-score orderings are
 * reproducible across runs.
 */
export function rankEntries(
  entries: readonly MemoryEntry[],
  now: number,
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS,
): MemoryEntry[] {
  return [...entries].sort((a, b) => {
    const sb = scoreEntry(b, now, halfLifeDays);
    const sa = scoreEntry(a, now, halfLifeDays);
    if (sb !== sa) return sb - sa;
    if (a.updatedAt !== b.updatedAt) return b.updatedAt.localeCompare(a.updatedAt);
    return a.id.localeCompare(b.id);
  });
}
