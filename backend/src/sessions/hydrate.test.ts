/**
 * Tests for the hydrate-from-archive entry point (Wave 3).
 * Uses an InMemorySessionStore — no DB, no network.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { hydrate } from "./hydrate";
import { InMemorySessionStore } from "./store";

const T0 = "2026-05-22T00:00:00.000Z";
const U1 = "user-1";

let store: InMemorySessionStore;
beforeEach(() => {
  store = new InMemorySessionStore();
});

describe("hydrate", () => {
  it("returns the session when it exists", async () => {
    const s = await store.create({ userId: U1, data: { step: 3 }, now: T0 });
    const hydrated = await hydrate(store, s.id);
    expect(hydrated).toEqual(s);
  });

  it("returns undefined when the session does not exist", async () => {
    const result = await hydrate(store, "unknown-id");
    expect(result).toBeUndefined();
  });

  it("returns the latest state after a save", async () => {
    const s = await store.create({ userId: U1, data: { step: 1 }, now: T0 });
    await store.save(s.id, { step: 5, resumed: true });
    const hydrated = await hydrate(store, s.id);
    expect(hydrated!.data).toEqual({ step: 5, resumed: true });
  });
});
