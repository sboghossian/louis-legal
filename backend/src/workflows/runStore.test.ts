/**
 * Tests for the in-memory workflow run store (Wave 2, Slice 2a): create defaults,
 * per-user isolation, validated lifecycle transitions, patch/finding mutation,
 * and delete/clear. Deterministic: time-sensitive calls pass an explicit ISO
 * `now`.
 */
import { describe, it, expect, beforeEach } from "vitest";

import { InMemoryRunStore, VALID_TRANSITIONS, canTransition } from "./runStore";
import type { Finding, RunStatus } from "./types";

const T0 = "2026-05-22T00:00:00.000Z";
const T1 = "2026-05-22T01:00:00.000Z";
const U = "user-1";

let store: InMemoryRunStore;
beforeEach(() => {
  store = new InMemoryRunStore();
});

const finding = (over: Partial<Finding> = {}): Finding => ({
  id: "f1",
  stepId: "risk-flags",
  severity: "RED",
  title: "Unilateral termination right",
  detail: "Clause 12.3 lets the counterparty terminate for convenience.",
  ...over,
});

describe("create", () => {
  it("starts queued at step 0 with defaults filled", async () => {
    const run = await store.create({ userId: U, templateId: "contract-review", now: T0 });
    expect(run.id).toBeTruthy();
    expect(run.userId).toBe(U);
    expect(run.templateId).toBe("contract-review");
    expect(run.status).toBe("queued");
    expect(run.currentStepIndex).toBe(0);
    expect(run.findings).toEqual([]);
    expect(run.createdAt).toBe(T0);
    expect(run.updatedAt).toBe(T0);
    expect(run.input).toBeUndefined();
    expect(await store.get(run.id)).toEqual(run);
  });

  it("persists free-form input when provided", async () => {
    const run = await store.create({
      userId: U,
      templateId: "due-diligence",
      input: { matterId: "m-7", docIds: ["d1", "d2"] },
      now: T0,
    });
    expect(run.input).toEqual({ matterId: "m-7", docIds: ["d1", "d2"] });
  });
});

describe("per-user isolation", () => {
  it("list returns only the querying user's runs, newest first", async () => {
    await store.create({ userId: U, templateId: "contract-review", now: T0 });
    await store.create({ userId: U, templateId: "research-memo", now: T1 });
    await store.create({ userId: "other", templateId: "contract-review", now: T1 });

    const mine = await store.list(U);
    expect(mine).toHaveLength(2);
    expect(mine.every((r) => r.userId === U)).toBe(true);
    expect(mine[0].createdAt).toBe(T1); // newest first
    expect(mine[1].createdAt).toBe(T0);

    expect(await store.list("other")).toHaveLength(1);
    expect(await store.list("nobody")).toEqual([]);
  });
});

describe("transitions", () => {
  it("declares the documented lifecycle and terminals", () => {
    expect(VALID_TRANSITIONS.queued).toEqual(["running", "failed"]);
    expect(VALID_TRANSITIONS.running).toEqual(["gated", "assembling", "failed"]);
    expect(VALID_TRANSITIONS.gated).toEqual(["running", "failed"]);
    expect(VALID_TRANSITIONS.assembling).toEqual(["done", "failed"]);
    expect(VALID_TRANSITIONS.done).toEqual([]);
    expect(VALID_TRANSITIONS.failed).toEqual([]);
  });

  it("canTransition matches the table", () => {
    expect(canTransition("queued", "running")).toBe(true);
    expect(canTransition("running", "gated")).toBe(true);
    expect(canTransition("gated", "running")).toBe(true);
    expect(canTransition("assembling", "done")).toBe(true);
    expect(canTransition("queued", "done")).toBe(false);
    expect(canTransition("done", "running")).toBe(false);
  });

  it("walks the happy path queued → running → assembling → done", async () => {
    const run = await store.create({ userId: U, templateId: "contract-review", now: T0 });
    expect((await store.transition(run.id, "running", { now: T1 }))?.status).toBe("running");
    expect((await store.transition(run.id, "assembling", { now: T1 }))?.status).toBe("assembling");
    const done = await store.transition(run.id, "done", { now: T1 });
    expect(done?.status).toBe("done");
    expect(done?.updatedAt).toBe(T1);
  });

  it("supports the gate loop running → gated → running", async () => {
    const run = await store.create({ userId: U, templateId: "due-diligence", now: T0 });
    await store.transition(run.id, "running", { now: T0 });
    expect((await store.transition(run.id, "gated", { now: T0 }))?.status).toBe("gated");
    expect((await store.transition(run.id, "running", { now: T1 }))?.status).toBe("running");
  });

  it("throws on an illegal transition", async () => {
    const run = await store.create({ userId: U, templateId: "contract-review", now: T0 });
    await expect(store.transition(run.id, "done")).rejects.toThrow(/illegal run transition/);
  });

  it("records an error reason when transitioning to failed", async () => {
    const run = await store.create({ userId: U, templateId: "contract-review", now: T0 });
    await store.transition(run.id, "running", { now: T0 });
    const failed = await store.transition(run.id, "failed", { error: "step crashed", now: T1 });
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toBe("step crashed");
  });

  it("returns undefined for an unknown run", async () => {
    expect(await store.transition("nope", "running")).toBeUndefined();
  });
});

describe("update + addFinding", () => {
  it("patches mutable fields and bumps updatedAt", async () => {
    const run = await store.create({ userId: U, templateId: "contract-review", now: T0 });
    const patched = await store.update(run.id, { currentStepIndex: 2, deliverable: "DRAFT" }, T1);
    expect(patched?.currentStepIndex).toBe(2);
    expect(patched?.deliverable).toBe("DRAFT");
    expect(patched?.status).toBe("queued"); // update never changes status
    expect(patched?.updatedAt).toBe(T1);
  });

  it("appends findings in order", async () => {
    const run = await store.create({ userId: U, templateId: "due-diligence", now: T0 });
    await store.addFinding(run.id, finding({ id: "f1" }), T1);
    await store.addFinding(run.id, finding({ id: "f2", severity: "YELLOW" }), T1);
    const got = await store.get(run.id);
    expect(got?.findings.map((f) => f.id)).toEqual(["f1", "f2"]);
    expect(got?.findings[1].severity).toBe("YELLOW");
  });

  it("update/addFinding return undefined for an unknown run", async () => {
    expect(await store.update("nope", { currentStepIndex: 1 })).toBeUndefined();
    expect(await store.addFinding("nope", finding())).toBeUndefined();
  });
});

describe("delete + clear", () => {
  it("delete removes one run and reports whether it existed", async () => {
    const run = await store.create({ userId: U, templateId: "contract-review", now: T0 });
    expect(await store.delete(run.id)).toBe(true);
    expect(await store.get(run.id)).toBeUndefined();
    expect(await store.delete(run.id)).toBe(false);
  });

  it("clear drops everything", async () => {
    await store.create({ userId: U, templateId: "contract-review", now: T0 });
    await store.create({ userId: U, templateId: "research-memo", now: T0 });
    await store.clear();
    expect(await store.list(U)).toEqual([]);
  });
});

// Compile-time guard: keep VALID_TRANSITIONS exhaustive over RunStatus.
const _exhaustive: Record<RunStatus, readonly RunStatus[]> = VALID_TRANSITIONS;
void _exhaustive;
