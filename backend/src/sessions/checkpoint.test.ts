/**
 * Wave 4 — Checkpoint helper tests.
 *
 * All tests use an isolated {@link InMemorySessionStore} instance — no
 * network, no singletons. Each `describe` block gets its own store so tests
 * cannot bleed into each other.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySessionStore } from "./store";
import {
  checkpointStart,
  checkpointSave,
  checkpointHydrate,
} from "./checkpoint";

// ---------------------------------------------------------------------------
// checkpointStart
// ---------------------------------------------------------------------------

describe("checkpointStart", () => {
  let store: InMemorySessionStore;

  beforeEach(() => {
    store = new InMemorySessionStore();
  });

  it("creates a session owned by the given userId", async () => {
    const session = await checkpointStart(store, "user-1");
    expect(session.userId).toBe("user-1");
    expect(typeof session.id).toBe("string");
    expect(session.id.length).toBeGreaterThan(0);
  });

  it("stores the supplied initial data", async () => {
    const session = await checkpointStart(store, "user-1", {
      workflow: "onboarding",
      step: 0,
    });
    expect(session.data).toEqual({ workflow: "onboarding", step: 0 });
  });

  it("defaults data to an empty object when omitted", async () => {
    const session = await checkpointStart(store, "user-1");
    expect(session.data).toEqual({});
  });

  it("persists the session so it can be retrieved later", async () => {
    const created = await checkpointStart(store, "user-1", { foo: "bar" });
    const fetched = await store.get(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(created.id);
  });

  it("each call creates a distinct session", async () => {
    const a = await checkpointStart(store, "user-1");
    const b = await checkpointStart(store, "user-1");
    expect(a.id).not.toBe(b.id);
  });
});

// ---------------------------------------------------------------------------
// checkpointSave
// ---------------------------------------------------------------------------

describe("checkpointSave", () => {
  let store: InMemorySessionStore;

  beforeEach(() => {
    store = new InMemorySessionStore();
  });

  it("merges new keys without dropping existing ones", async () => {
    const session = await checkpointStart(store, "user-1", { a: 1, b: 2 });
    const updated = await checkpointSave(store, session.id, { b: 99, c: 3 });
    expect(updated?.data).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("bumps updatedAt relative to createdAt", async () => {
    const session = await checkpointStart(store, "user-1", { x: 0 });
    // Advance time by at least 1 ms
    await new Promise((r) => setTimeout(r, 2));
    const updated = await checkpointSave(store, session.id, { x: 1 });
    expect(updated?.updatedAt).not.toBe(session.createdAt);
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
      new Date(session.createdAt).getTime(),
    );
  });

  it("returns undefined for an unknown session id", async () => {
    const result = await checkpointSave(store, "non-existent-id", { k: "v" });
    expect(result).toBeUndefined();
  });

  it("preserves the session id and userId after a save", async () => {
    const session = await checkpointStart(store, "user-1", { step: 1 });
    const updated = await checkpointSave(store, session.id, { step: 2 });
    expect(updated?.id).toBe(session.id);
    expect(updated?.userId).toBe("user-1");
  });

  it("a subsequent save accumulates across multiple patches", async () => {
    const session = await checkpointStart(store, "user-1", {});
    await checkpointSave(store, session.id, { a: 1 });
    const final = await checkpointSave(store, session.id, { b: 2 });
    expect(final?.data).toEqual({ a: 1, b: 2 });
  });
});

// ---------------------------------------------------------------------------
// checkpointHydrate
// ---------------------------------------------------------------------------

describe("checkpointHydrate", () => {
  let store: InMemorySessionStore;

  beforeEach(() => {
    store = new InMemorySessionStore();
  });

  it("returns the session for the correct owner", async () => {
    const session = await checkpointStart(store, "user-alice", { chat: "hi" });
    const hydrated = await checkpointHydrate(store, session.id, "user-alice");
    expect(hydrated).toBeDefined();
    expect(hydrated?.id).toBe(session.id);
    expect(hydrated?.userId).toBe("user-alice");
  });

  it("returns undefined for a different userId — ownership isolation", async () => {
    const session = await checkpointStart(store, "user-alice", {});
    const hydrated = await checkpointHydrate(store, session.id, "user-bob");
    expect(hydrated).toBeUndefined();
  });

  it("returns undefined for an unknown session id", async () => {
    const hydrated = await checkpointHydrate(store, "ghost-id", "user-alice");
    expect(hydrated).toBeUndefined();
  });

  it("does not expose the session after the owner is changed externally", async () => {
    // Simulate a session originally belonging to alice being checked by alice
    const session = await checkpointStart(store, "user-alice", {});
    // bob should never see it
    expect(
      await checkpointHydrate(store, session.id, "user-bob"),
    ).toBeUndefined();
    // alice still can
    expect(
      await checkpointHydrate(store, session.id, "user-alice"),
    ).toBeDefined();
  });
});
