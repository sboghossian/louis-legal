/**
 * Tests for the four-tier working-memory store (Processor v2, AC3).
 *
 * Covers the three AC3 requirements — tier write/read, tag-filtered retrieval,
 * and effectiveness/recency weighting order — plus precedent promotion and the
 * pure ranking helpers. Deterministic: every time-sensitive call passes an
 * explicit ISO `now`, so recency decay never depends on the wall clock.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { InMemoryMemoryStore, PROMOTION_THRESHOLD } from "./store";
import { effectivenessScore, recencyWeight, scoreEntry } from "./ranking";
import type { MemoryEntry } from "./types";

const T0 = "2026-05-01T00:00:00.000Z";
const t0 = Date.parse(T0);
const daysAfter = (n: number) => new Date(t0 + n * 86_400_000).toISOString();

let store: InMemoryMemoryStore;
beforeEach(() => {
  store = new InMemoryMemoryStore();
});

describe("tier write/read", () => {
  it("round-trips an entry with defaults filled", () => {
    const e = store.put({ tier: "matter", content: "MSA capped at 12 months", now: T0 });
    expect(e.id).toBeTruthy();
    expect(e.tier).toBe("matter");
    expect(e.helpfulCount).toBe(0);
    expect(e.unhelpfulCount).toBe(0);
    expect(e.usageCount).toBe(0);
    expect(e.createdAt).toBe(T0);
    expect(e.lastUsedAt).toBe(T0);
    expect(store.get(e.id)).toEqual(e);
  });

  it("defaults a precedent to tentative, leaves other tiers without status", () => {
    const p = store.put({ tier: "precedent", content: "indemnity carve-out pattern", now: T0 });
    const s = store.put({ tier: "session", content: "user prefers UAE law", now: T0 });
    expect(p.status).toBe("tentative");
    expect(s.status).toBeUndefined();
  });

  it("query can restrict to a single tier", () => {
    store.put({ tier: "session", content: "a", now: T0 });
    store.put({ tier: "institutional", content: "b", now: T0 });
    const inst = store.query({ tier: "institutional", now: T0 });
    expect(inst).toHaveLength(1);
    expect(inst[0].content).toBe("b");
  });

  it("returns undefined for an unknown id", () => {
    expect(store.get("nope")).toBeUndefined();
  });
});

describe("tag-filtered retrieval", () => {
  beforeEach(() => {
    store.put({ tier: "precedent", content: "UAE rule", tags: { jurisdiction: "UAE" }, now: T0 });
    store.put({ tier: "precedent", content: "KSA rule", tags: { jurisdiction: "KSA" }, now: T0 });
    store.put({ tier: "precedent", content: "general rule", now: T0 }); // untagged = broad
  });

  it("matches the requested value AND broadly-applicable (untagged) entries", () => {
    const got = store.query({ tags: { jurisdiction: "UAE" }, now: T0 }).map((e) => e.content);
    expect(got).toContain("UAE rule");
    expect(got).toContain("general rule");
    expect(got).not.toContain("KSA rule");
  });

  it("filters across multiple tag keys independently", () => {
    store.put({
      tier: "matter",
      content: "employment+UAE+contract",
      tags: { practiceArea: "employment", jurisdiction: "UAE", docType: "contract" },
      now: T0,
    });
    const hit = store.query({ tags: { practiceArea: "employment", docType: "contract" }, now: T0 });
    expect(hit.map((e) => e.content)).toContain("employment+UAE+contract");
    const miss = store.query({ tags: { practiceArea: "litigation" }, now: T0 });
    expect(miss.map((e) => e.content)).not.toContain("employment+UAE+contract");
  });

  it("scopeId narrows to an exact scope", () => {
    store.put({ tier: "matter", content: "matter-7 note", scopeId: "matter-7", now: T0 });
    store.put({ tier: "matter", content: "matter-9 note", scopeId: "matter-9", now: T0 });
    const got = store.query({ scopeId: "matter-7", now: T0 }).map((e) => e.content);
    expect(got).toEqual(["matter-7 note"]);
  });
});

describe("effectiveness/recency weighting order", () => {
  it("ranks helped-and-fresh above weak, and fresh above stale at equal help", () => {
    const strong = store.put({ tier: "institutional", content: "strong", now: T0 });
    const weak = store.put({ tier: "institutional", content: "weak", now: T0 });
    const stale = store.put({ tier: "institutional", content: "stale", now: T0 });

    // strong: many helpful, used today.
    for (let i = 0; i < 10; i++) store.recordOutcome(strong.id, "helped", T0);
    store.recordUsage(strong.id, daysAfter(30));
    // weak: barely helpful, used today.
    store.recordOutcome(weak.id, "helped", T0);
    store.recordUsage(weak.id, daysAfter(30));
    // stale: as helpful as strong, but last used 60 days earlier.
    for (let i = 0; i < 10; i++) store.recordOutcome(stale.id, "helped", T0);
    store.recordUsage(stale.id, daysAfter(0));

    const order = store.query({ tier: "institutional", now: daysAfter(30) }).map((e) => e.content);
    expect(order).toEqual(["strong", "weak", "stale"]);
  });

  it("unhelpful feedback pushes an entry down", () => {
    const good = store.put({ tier: "session", content: "good", now: T0 });
    const bad = store.put({ tier: "session", content: "bad", now: T0 });
    store.recordOutcome(good.id, "helped", T0);
    store.recordOutcome(bad.id, "unhelpful", T0);
    const order = store.query({ tier: "session", now: T0 }).map((e) => e.content);
    expect(order).toEqual(["good", "bad"]);
  });

  it("honours limit after ranking", () => {
    const a = store.put({ tier: "session", content: "a", now: T0 });
    store.put({ tier: "session", content: "b", now: T0 });
    store.recordOutcome(a.id, "helped", T0);
    const top = store.query({ tier: "session", limit: 1, now: T0 });
    expect(top).toHaveLength(1);
    expect(top[0].content).toBe("a");
  });
});

describe("feedback + precedent promotion", () => {
  it("recordUsage advances usage count and recency", () => {
    const e = store.put({ tier: "matter", content: "x", now: T0 });
    store.recordUsage(e.id, daysAfter(2));
    const got = store.get(e.id)!;
    expect(got.usageCount).toBe(1);
    expect(got.lastUsedAt).toBe(daysAfter(2));
  });

  it("reinforce promotes a tentative precedent at the threshold", () => {
    const p = store.put({ tier: "precedent", content: "pattern", now: T0 });
    expect(p.status).toBe("tentative");
    for (let i = 0; i < PROMOTION_THRESHOLD - 1; i++) store.reinforce(p.id, T0);
    expect(store.get(p.id)!.status).toBe("tentative");
    store.reinforce(p.id, T0);
    expect(store.get(p.id)!.status).toBe("confirmed");
  });

  it("reinforce does not add a status to non-precedent tiers", () => {
    const s = store.put({ tier: "matter", content: "y", now: T0 });
    store.reinforce(s.id, T0);
    expect(store.get(s.id)!.status).toBeUndefined();
  });

  it("feedback on a missing id is a no-op returning undefined", () => {
    expect(store.recordOutcome("nope", "helped")).toBeUndefined();
    expect(store.recordUsage("nope")).toBeUndefined();
    expect(store.reinforce("nope")).toBeUndefined();
  });
});

describe("pure ranking helpers", () => {
  const base: MemoryEntry = {
    id: "x",
    tier: "institutional",
    content: "c",
    tags: {},
    helpfulCount: 0,
    unhelpfulCount: 0,
    usageCount: 0,
    createdAt: T0,
    updatedAt: T0,
    lastUsedAt: T0,
  };

  it("effectivenessScore is neutral 0.5 with no feedback", () => {
    expect(effectivenessScore(base)).toBeCloseTo(0.5, 10);
  });

  it("effectivenessScore rises with helpful, falls with unhelpful", () => {
    expect(effectivenessScore({ ...base, helpfulCount: 9 })).toBeGreaterThan(0.5);
    expect(effectivenessScore({ ...base, unhelpfulCount: 9 })).toBeLessThan(0.5);
  });

  it("recencyWeight halves at one half-life and clamps future to 1", () => {
    expect(recencyWeight(base, t0, 30)).toBeCloseTo(1, 10);
    expect(recencyWeight(base, t0 + 30 * 86_400_000, 30)).toBeCloseTo(0.5, 10);
    expect(recencyWeight(base, t0 - 86_400_000, 30)).toBeCloseTo(1, 10); // future lastUsedAt
  });

  it("scoreEntry combines both factors", () => {
    const e = { ...base, helpfulCount: 9 };
    expect(scoreEntry(e, t0, 30)).toBeCloseTo(effectivenessScore(e), 10);
  });
});
