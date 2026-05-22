/**
 * Tests for the memory feedback loop (Processor v2): annotation write/read,
 * rating→outcome mapping, and applying feedback through the store.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { InMemoryMemoryStore } from "./store";
import {
  memoryUsedAnnotation,
  extractMemoryUsedIds,
  ratingToOutcome,
  applyMemoryFeedback,
  MEMORY_USED_ANNOTATION,
} from "./feedback";

const T0 = "2026-05-01T00:00:00.000Z";
const U = "user-1";

describe("memoryUsedAnnotation", () => {
  it("builds an annotation for non-empty string ids", () => {
    expect(memoryUsedAnnotation(["a", "b"])).toEqual({
      type: MEMORY_USED_ANNOTATION,
      ids: ["a", "b"],
    });
  });

  it("returns null for empty / all-invalid ids and drops non-strings", () => {
    expect(memoryUsedAnnotation([])).toBeNull();
    expect(memoryUsedAnnotation(["", null, 5])).toBeNull();
    expect(memoryUsedAnnotation(["ok", "", 7])).toEqual({
      type: MEMORY_USED_ANNOTATION,
      ids: ["ok"],
    });
  });
});

describe("extractMemoryUsedIds", () => {
  it("pulls ids out of a mixed annotations array", () => {
    const annotations = [
      { type: "citation_data", doc_id: "d1" },
      { type: MEMORY_USED_ANNOTATION, ids: ["m1", "m2"] },
      { type: "edit_data" },
    ];
    expect(extractMemoryUsedIds(annotations)).toEqual(["m1", "m2"]);
  });

  it("is defensive against junk", () => {
    expect(extractMemoryUsedIds(null)).toEqual([]);
    expect(extractMemoryUsedIds("nope")).toEqual([]);
    expect(extractMemoryUsedIds([{ type: MEMORY_USED_ANNOTATION }])).toEqual([]);
    expect(extractMemoryUsedIds([{ type: MEMORY_USED_ANNOTATION, ids: ["a", 1, null] }])).toEqual(["a"]);
  });
});

describe("ratingToOutcome", () => {
  it("maps up→helped and down→unhelpful", () => {
    expect(ratingToOutcome("up")).toBe("helped");
    expect(ratingToOutcome("down")).toBe("unhelpful");
  });
});

describe("applyMemoryFeedback", () => {
  let store: InMemoryMemoryStore;
  beforeEach(() => {
    store = new InMemoryMemoryStore();
  });

  it("records helped on each id and ignores unknown ids", async () => {
    const a = await store.put({ userId: U, tier: "institutional", content: "a", now: T0 });
    const recorded = await applyMemoryFeedback(store, [a.id, "missing"], "up");
    expect(recorded).toBe(1); // only the real id
    expect((await store.get(a.id))!.helpfulCount).toBe(1);
  });

  it("a thumbs up lifts an entry above an unrated peer", async () => {
    const liked = await store.put({ userId: U, tier: "session", content: "liked", now: T0 });
    await store.put({ userId: U, tier: "session", content: "neutral", now: T0 });
    await applyMemoryFeedback(store, [liked.id], "up");
    const order = (await store.query({ userId: U, tier: "session", now: T0 })).map((e) => e.content);
    expect(order[0]).toBe("liked");
  });

  it("a thumbs down sinks an entry below an unrated peer", async () => {
    const disliked = await store.put({ userId: U, tier: "session", content: "disliked", now: T0 });
    await store.put({ userId: U, tier: "session", content: "neutral", now: T0 });
    await applyMemoryFeedback(store, [disliked.id], "down");
    const order = (await store.query({ userId: U, tier: "session", now: T0 })).map((e) => e.content);
    expect(order[order.length - 1]).toBe("disliked");
  });
});
