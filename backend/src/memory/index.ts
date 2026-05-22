/**
 * Public API barrel for the four-tier working-memory store (Processor v2, AC3).
 *
 * Integration point: import { memoryStore } from "@/memory" to write/query
 * tiered memory, then inject the top-ranked slice into a turn's context. The
 * ranking helpers are exported for callers that want to score externally-held
 * entries.
 */
export { InMemoryMemoryStore, PROMOTION_THRESHOLD, matchesTags } from "./store";
export { SupabaseMemoryStore, rowToEntry, entryToRow } from "./supabaseStore";
export type { MemoryRow } from "./supabaseStore";
export { memoryStore, createMemoryStore, isSupabaseConfigured } from "./factory";
export {
  effectivenessScore,
  recencyWeight,
  scoreEntry,
  rankEntries,
  DEFAULT_HALF_LIFE_DAYS,
} from "./ranking";
export {
  buildMemoryContext,
  summarizeTurnForMemory,
  DEFAULT_CONTEXT_LIMIT,
  MAX_MEMORY_CHARS,
} from "./context";
export type { MemoryContextQuery, MemoryContextResult } from "./context";
export {
  memoryUsedAnnotation,
  extractMemoryUsedIds,
  ratingToOutcome,
  applyMemoryFeedback,
  MEMORY_USED_ANNOTATION,
} from "./feedback";
export type { FeedbackRating, MemoryUsedAnnotation } from "./feedback";
export { TAG_KEYS } from "./types";
export type {
  MemoryTier,
  PrecedentStatus,
  Outcome,
  MemoryTags,
  MemoryInput,
  MemoryEntry,
  MemoryQuery,
  MemoryStore,
} from "./types";
