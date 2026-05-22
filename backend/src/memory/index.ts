/**
 * Public API barrel for the four-tier working-memory store (Processor v2, AC3).
 *
 * Integration point: import { memoryStore } from "@/memory" to write/query
 * tiered memory, then inject the top-ranked slice into a turn's context. The
 * ranking helpers are exported for callers that want to score externally-held
 * entries.
 */
export { InMemoryMemoryStore, memoryStore, PROMOTION_THRESHOLD } from "./store";
export {
  effectivenessScore,
  recencyWeight,
  scoreEntry,
  rankEntries,
  DEFAULT_HALF_LIFE_DAYS,
} from "./ranking";
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
