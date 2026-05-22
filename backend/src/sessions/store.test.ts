/**
 * Tests for the durable session store (Wave 3) — async CRUD, per-user
 * isolation, `save` updates `updatedAt`, and `list` is user-scoped.
 * Deterministic: time-sensitive assertions pin explicit ISO timestamps.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { InMemorySessionStore } from "./store";

const T0 = "2026-05-22T00:00:00.000Z";
const T1 = "2026-05-22T01:00:00.000Z";
const U1 = "user-1";
const U2 = "user-2";

let store: InMemorySessionStore;
beforeEach(() => {
  store = new InMemorySessionStore();
});

describe("create / get", () => {
  it("round-trips a session with defaults filled", async () => {
    const s = await store.create({ userId: U1, now: T0 });
    expect(s.id).toBeTruthy();
    expect(s.userId).toBe(U1);
    expect(s.data).toEqual({});
    expect(s.createdAt).toBe(T0);
    expect(s.updatedAt).toBe(T0);
    expect(await store.get(s.id)).toEqual(s);
  });

  it("accepts an initial data payload", async () => {
    const s = await store.create({ userId: U1, data: { step: 1 }, now: T0 });
    expect(s.data).toEqual({ step: 1 });
  });

  it("returns undefined for an unknown id", async () => {
    expect(await store.get("nope")).toBeUndefined();
  });

  it("does not mutate the caller's data object", async () => {
    const payload = { a: 1 };
    const s = await store.create({ userId: U1, data: payload, now: T0 });
    payload.a = 999;
    expect(s.data).toEqual({ a: 1 });
  });
});

describe("list — user-scoped", () => {
  it("returns only sessions belonging to the requested user", async () => {
    const s1 = await store.create({ userId: U1, now: T0 });
    await store.create({ userId: U2, now: T0 });

    const result = await store.list(U1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(s1.id);
  });

  it("returns sessions newest-first", async () => {
    const early = await store.create({ userId: U1, now: T0 });
    const late = await store.create({ userId: U1, now: T1 });
    const result = await store.list(U1);
    expect(result[0].id).toBe(late.id);
    expect(result[1].id).toBe(early.id);
  });

  it("returns an empty array when the user has no sessions", async () => {
    await store.create({ userId: U2, now: T0 });
    expect(await store.list(U1)).toEqual([]);
  });
});

describe("save", () => {
  it("replaces data and bumps updatedAt", async () => {
    const s = await store.create({ userId: U1, data: { x: 0 }, now: T0 });
    const before = s.updatedAt;

    // small pause so the real clock advances; save does NOT take a `now` param
    // (mirrors real usage) — we only assert the timestamp changed.
    const updated = await store.save(s.id, { x: 42 });
    expect(updated).toBeDefined();
    expect(updated!.data).toEqual({ x: 42 });
    expect(updated!.updatedAt).not.toBe(before);
  });

  it("returns undefined for an unknown id", async () => {
    expect(await store.save("nope", { x: 1 })).toBeUndefined();
  });

  it("the get() after save reflects the new data", async () => {
    const s = await store.create({ userId: U1, now: T0 });
    await store.save(s.id, { done: true });
    const fetched = await store.get(s.id);
    expect(fetched!.data).toEqual({ done: true });
  });
});

describe("delete", () => {
  it("removes the session so get returns undefined", async () => {
    const s = await store.create({ userId: U1, now: T0 });
    await store.delete(s.id);
    expect(await store.get(s.id)).toBeUndefined();
  });

  it("is a no-op for an unknown id", async () => {
    await expect(store.delete("nope")).resolves.toBeUndefined();
  });
});

describe("per-user isolation", () => {
  it("never exposes one user's session to another via list", async () => {
    for (let i = 0; i < 3; i++) await store.create({ userId: U1, now: T0 });
    for (let i = 0; i < 2; i++) await store.create({ userId: U2, now: T0 });

    const u1List = await store.list(U1);
    const u2List = await store.list(U2);

    expect(u1List).toHaveLength(3);
    expect(u2List).toHaveLength(2);
    expect(u1List.every((s) => s.userId === U1)).toBe(true);
    expect(u2List.every((s) => s.userId === U2)).toBe(true);
  });
});

describe("clear", () => {
  it("wipes all sessions", async () => {
    await store.create({ userId: U1, now: T0 });
    await store.create({ userId: U2, now: T0 });
    await store.clear();
    expect(await store.list(U1)).toEqual([]);
    expect(await store.list(U2)).toEqual([]);
  });
});
