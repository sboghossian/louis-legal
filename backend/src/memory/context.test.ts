/**
 * Tests for the turn-time memory helpers (Processor v2, "memory goes live")
 * including per-user isolation. Deterministic: every call passes an explicit
 * ISO `now`.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { InMemoryMemoryStore } from "./store";
import {
  buildMemoryContext,
  summarizeTurnForMemory,
  MAX_MEMORY_CHARS,
} from "./context";

const T0 = "2026-05-01T00:00:00.000Z";
const U = "user-1";

let store: InMemoryMemoryStore;
beforeEach(() => {
  store = new InMemoryMemoryStore();
});

describe("buildMemoryContext", () => {
  it("returns an empty block + no entries for an empty store", () => {
    const r = buildMemoryContext(store, { userId: U, now: T0 });
    expect(r.block).toBe("");
    expect(r.entries).toEqual([]);
  });

  it("injects cross-session tiers without a scope, ranked by effectiveness", () => {
    const strong = store.put({ userId: U, tier: "institutional", content: "strong rule", now: T0 });
    store.put({ userId: U, tier: "precedent", content: "weak pattern", now: T0 });
    for (let i = 0; i < 10; i++) store.recordOutcome(strong.id, "helped", T0);

    const r = buildMemoryContext(store, { userId: U, now: T0 });
    expect(r.entries[0].content).toBe("strong rule");
    expect(r.entries).toHaveLength(2);
    expect(r.block).toContain("## Working memory");
    expect(r.block).toContain("- [institutional] strong rule");
    expect(r.block).toContain("- [precedent] weak pattern");
  });

  it("gates matter/session tiers behind their scope id", () => {
    store.put({ userId: U, tier: "matter", content: "matter note", scopeId: "m1", now: T0 });
    store.put({ userId: U, tier: "session", content: "session note", scopeId: "s1", now: T0 });

    const none = buildMemoryContext(store, { userId: U, now: T0 });
    expect(none.entries).toHaveLength(0);

    const scoped = buildMemoryContext(store, { userId: U, matterId: "m1", sessionId: "s1", now: T0 });
    const contents = scoped.entries.map((e) => e.content);
    expect(contents).toContain("matter note");
    expect(contents).toContain("session note");

    const otherMatter = buildMemoryContext(store, { userId: U, matterId: "m2", now: T0 });
    expect(otherMatter.entries).toHaveLength(0);
  });

  it("filters by jurisdiction tag (untagged is broadly-applicable)", () => {
    store.put({ userId: U, tier: "institutional", content: "UAE only", tags: { jurisdiction: "UAE" }, now: T0 });
    store.put({ userId: U, tier: "institutional", content: "KSA only", tags: { jurisdiction: "KSA" }, now: T0 });
    store.put({ userId: U, tier: "institutional", content: "any jurisdiction", now: T0 });

    const r = buildMemoryContext(store, { userId: U, tags: { jurisdiction: "UAE" }, now: T0 });
    const contents = r.entries.map((e) => e.content);
    expect(contents).toContain("UAE only");
    expect(contents).toContain("any jurisdiction");
    expect(contents).not.toContain("KSA only");
  });

  it("caps the number of injected entries at limit", () => {
    for (let i = 0; i < 5; i++) {
      store.put({ userId: U, tier: "institutional", content: `rule ${i}`, now: T0 });
    }
    const r = buildMemoryContext(store, { userId: U, limit: 2, now: T0 });
    expect(r.entries).toHaveLength(2);
    expect(r.block.split("\n").filter((l) => l.startsWith("- ")).length).toBe(2);
  });

  it("never injects another user's memory (all tiers)", () => {
    store.put({ userId: "alice", tier: "institutional", content: "alice inst", now: T0 });
    store.put({ userId: "alice", tier: "matter", content: "alice matter", scopeId: "m1", now: T0 });
    store.put({ userId: "bob", tier: "institutional", content: "bob inst", now: T0 });

    const aliceCtx = buildMemoryContext(store, { userId: "alice", matterId: "m1", now: T0 });
    const contents = aliceCtx.entries.map((e) => e.content);
    expect(contents).toContain("alice inst");
    expect(contents).toContain("alice matter");
    expect(contents).not.toContain("bob inst");
  });
});

describe("summarizeTurnForMemory", () => {
  it("condenses a normal turn into bounded content", () => {
    const c = summarizeTurnForMemory({
      userMessage: "Is the non-compete enforceable in the DIFC?",
      assistantText: "Generally yes, if reasonable in scope and duration.",
    });
    expect(c).toContain("Asked:");
    expect(c).toContain("Answered:");
    expect(c!.length).toBeLessThanOrEqual(MAX_MEMORY_CHARS + 1);
  });

  it("returns null for an empty user message or empty answer", () => {
    expect(summarizeTurnForMemory({ userMessage: "", assistantText: "x" })).toBeNull();
    expect(summarizeTurnForMemory({ userMessage: "x", assistantText: "   " })).toBeNull();
  });

  it("clips very long inputs", () => {
    const c = summarizeTurnForMemory({
      userMessage: "a".repeat(1000),
      assistantText: "b".repeat(1000),
    });
    expect(c).not.toBeNull();
    expect(c!.length).toBeLessThanOrEqual(MAX_MEMORY_CHARS + 1);
    expect(c).toContain("…");
  });
});
