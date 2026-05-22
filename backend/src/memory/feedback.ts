/**
 * Memory feedback loop (Processor v2). Links a user's thumbs-up/down on an
 * assistant message back to the memory entries that informed it, so memory that
 * demonstrably helped is weighted up and useless memory decays.
 *
 * The link is carried on the assistant message's `annotations` as a
 * `{ type: "memory_used", ids }` entry (written at turn time, read at rate time).
 * Pure helpers + one store-driven applier — no I/O of their own.
 */

import type { MemoryStore, Outcome } from "./types";

/** Thumbs rating from the UI. */
export type FeedbackRating = "up" | "down";

/** Annotation type tag marking which memory entries a message used. */
export const MEMORY_USED_ANNOTATION = "memory_used";

export interface MemoryUsedAnnotation {
  type: typeof MEMORY_USED_ANNOTATION;
  ids: string[];
}

/**
 * Build the annotation recording which memory informed a message, or `null` when
 * there is nothing to record. Non-string / empty ids are dropped.
 */
export function memoryUsedAnnotation(entryIds: readonly unknown[]): MemoryUsedAnnotation | null {
  const ids = entryIds.filter((id): id is string => typeof id === "string" && id.length > 0);
  return ids.length > 0 ? { type: MEMORY_USED_ANNOTATION, ids } : null;
}

/**
 * Pull the memory ids out of a message's annotations array, defensively
 * (annotations is untyped jsonb that may contain unrelated entries).
 */
export function extractMemoryUsedIds(annotations: unknown): string[] {
  if (!Array.isArray(annotations)) return [];
  const out: string[] = [];
  for (const a of annotations) {
    if (
      a &&
      typeof a === "object" &&
      (a as { type?: unknown }).type === MEMORY_USED_ANNOTATION
    ) {
      const ids = (a as { ids?: unknown }).ids;
      if (Array.isArray(ids)) {
        for (const id of ids) if (typeof id === "string" && id) out.push(id);
      }
    }
  }
  return out;
}

/** up → helped, down → unhelpful. */
export function ratingToOutcome(rating: FeedbackRating): Outcome {
  return rating === "up" ? "helped" : "unhelpful";
}

/**
 * Record the same outcome on every memory id (parallel, best-effort). Ids not
 * found in the store are no-ops. Returns the number of entries that existed and
 * were recorded (≤ ids.length); a store write error rejects rather than counts.
 */
export async function applyMemoryFeedback(
  store: MemoryStore,
  ids: readonly string[],
  rating: FeedbackRating,
): Promise<number> {
  const outcome: Outcome = ratingToOutcome(rating);
  const results = await Promise.all(ids.map((id) => store.recordOutcome(id, outcome)));
  return results.filter((r) => r !== undefined).length;
}
