/**
 * Orchestrator engine tests (Wave 2, Slice 2b). Everything is injected and
 * faked — no LLM, no network. Covers: finding parsing, the happy path to `done`,
 * per-step model selection from the governor, grounding annotation, the gate
 * pause/resume loop, Full-Bench verdict application, validation rejection, and
 * fail-safe error capture.
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  runWorkflow,
  parseFindings,
  fallbackAssemble,
  type OrchestratorDeps,
} from "./orchestrator";
import { InMemoryRunStore } from "./runStore";
import type { LlmComplete } from "./contracts";
import type { WorkflowRun, WorkflowTemplate } from "./types";

const T0 = "2026-05-22T00:00:00.000Z";
const U = "user-1";

let store: InMemoryRunStore;
beforeEach(() => {
  store = new InMemoryRunStore();
});

/** A deterministic clock. */
const clock = () => T0;

/** modelForTier fake that records what it was asked for. */
function recordingTier(seen: string[]) {
  return (tier: "low" | "mid" | "main") => {
    seen.push(tier);
    return `model-${tier}`;
  };
}

const twoStep: WorkflowTemplate = {
  id: "t-two",
  title: "Two",
  description: "d",
  steps: [
    { id: "find", intent: "find risks", modelTier: "main", citesDocuments: true },
    { id: "write", intent: "write summary", modelTier: "mid" },
  ],
};

const baseDeps = (over: Partial<OrchestratorDeps> = {}): OrchestratorDeps => ({
  store,
  llm: async () => "no findings here",
  modelForTier: (t) => `model-${t}`,
  now: clock,
  ...over,
});

describe("parseFindings", () => {
  it("parses tagged lines and ignores prose", () => {
    const text = [
      "Some preamble.",
      "[RED] Unilateral termination :: clause 12.3 lets them walk",
      "[yellow] Vague indemnity :: scope unclear",
      "not a finding line",
      "[GREEN] Standard governing law",
    ].join("\n");
    const f = parseFindings("s1", text);
    expect(f.map((x) => x.severity)).toEqual(["RED", "YELLOW", "GREEN"]);
    expect(f[0].title).toBe("Unilateral termination");
    expect(f[0].detail).toBe("clause 12.3 lets them walk");
    expect(f[0].stepId).toBe("s1");
    expect(f[2].title).toBe("Standard governing law"); // no "::" → title=detail
  });

  it("returns nothing for prose-only output", () => {
    expect(parseFindings("s1", "just a paragraph of analysis")).toEqual([]);
  });
});

describe("happy path", () => {
  it("runs all steps, produces findings, and reaches done with a deliverable", async () => {
    const run = await store.create({ userId: U, templateId: twoStep.id, now: T0 });
    const llm: LlmComplete = async ({ user }) =>
      user.includes("find risks") ? "[RED] Bad clause :: too broad" : "ok, a prose summary";

    const final = await runWorkflow(baseDeps({ llm }), { template: twoStep, runId: run.id });

    expect(final.status).toBe("done");
    expect(final.currentStepIndex).toBe(2);
    expect(final.findings).toHaveLength(1);
    expect(final.findings[0].severity).toBe("RED");
    expect(final.deliverable).toContain("Bad clause");
  });

  it("asks the governor for each step's declared tier", async () => {
    const run = await store.create({ userId: U, templateId: twoStep.id, now: T0 });
    const seen: string[] = [];
    await runWorkflow(baseDeps({ modelForTier: recordingTier(seen) }), {
      template: twoStep,
      runId: run.id,
    });
    expect(seen).toEqual(["main", "mid"]);
  });
});

describe("grounding", () => {
  it("adds a YELLOW finding when a doc-citing step has unmatched citations", async () => {
    const run = await store.create({ userId: U, templateId: twoStep.id, now: T0 });
    const deps = baseDeps({
      llm: async () => "cites clause 99",
      grounding: () => ({ score: 0.2, unmatched: ["clause 99"] }),
      documentText: "the actual contract text",
    });
    const final = await runWorkflow(deps, { template: twoStep, runId: run.id });
    const yellow = final.findings.filter((f) => f.severity === "YELLOW");
    expect(yellow).toHaveLength(1);
    expect(yellow[0].title).toBe("Ungrounded citations");
    expect(yellow[0].citations).toEqual(["clause 99"]);
  });
});

describe("gates", () => {
  const gated: WorkflowTemplate = {
    id: "t-gate",
    title: "Gated",
    description: "d",
    steps: [
      { id: "analyze", intent: "analyze", modelTier: "mid" },
      { id: "send", intent: "send letter", modelTier: "mid", sideEffect: true, gate: true },
      { id: "wrap", intent: "wrap up", modelTier: "low" },
    ],
  };

  it("pauses at the gated step, then resumes through to done", async () => {
    const run = await store.create({ userId: U, templateId: gated.id, now: T0 });
    const deps = baseDeps();

    const paused = await runWorkflow(deps, { template: gated, runId: run.id });
    expect(paused.status).toBe("gated");
    expect(paused.currentStepIndex).toBe(1); // points AT the gated step

    // Approve = resume. The engine executes the gated step and continues.
    const resumed = await runWorkflow(deps, { template: gated, runId: run.id });
    expect(resumed.status).toBe("done");
    expect(resumed.currentStepIndex).toBe(3);
  });
});

describe("full-bench application", () => {
  it("drops withdrawn and revises revised RED findings before assembly", async () => {
    const tmpl: WorkflowTemplate = {
      id: "t-fb",
      title: "FB",
      description: "d",
      steps: [{ id: "find", intent: "find risks", modelTier: "main" }],
    };
    const run = await store.create({ userId: U, templateId: tmpl.id, now: T0 });
    const llm: LlmComplete = async () =>
      ["[RED] A :: keep", "[RED] B :: drop me"].join("\n");

    const deps = baseDeps({
      llm,
      fullBench: async (reds) =>
        reds.map((f) =>
          f.title === "B"
            ? { findingId: f.id, verdict: "withdrawn" as const, confidence: 0.9, rationale: "weak" }
            : { findingId: f.id, verdict: "revised" as const, confidence: 0.8, rationale: "tighten", revised: "kept + revised" },
        ),
    });

    const final = await runWorkflow(deps, { template: tmpl, runId: run.id });
    expect(final.status).toBe("done");
    expect(final.findings).toHaveLength(1);
    expect(final.findings[0].title).toBe("A");
    expect(final.findings[0].detail).toBe("kept + revised");
  });
});

describe("validation + fail-safe", () => {
  it("fails the run when the validator rejects the deliverable", async () => {
    const run = await store.create({ userId: U, templateId: twoStep.id, now: T0 });
    const deps = baseDeps({ validate: () => ({ ok: false, problems: ["too thin"] }) });
    const final = await runWorkflow(deps, { template: twoStep, runId: run.id });
    expect(final.status).toBe("failed");
    expect(final.error).toContain("too thin");
  });

  it("records failed (never throws) when a step llm throws", async () => {
    const run = await store.create({ userId: U, templateId: twoStep.id, now: T0 });
    const deps = baseDeps({
      llm: async () => {
        throw new Error("provider down");
      },
    });
    const final = await runWorkflow(deps, { template: twoStep, runId: run.id });
    expect(final.status).toBe("failed");
    expect(final.error).toBe("provider down");
  });

  it("is a no-op on an already-terminal run", async () => {
    const run = await store.create({ userId: U, templateId: twoStep.id, now: T0 });
    await store.transition(run.id, "running", { now: T0 });
    await store.transition(run.id, "assembling", { now: T0 });
    await store.transition(run.id, "done", { now: T0 });
    const final = await runWorkflow(baseDeps(), { template: twoStep, runId: run.id });
    expect(final.status).toBe("done");
  });
});

describe("fallbackAssemble", () => {
  it("groups findings by severity into a markdown doc", () => {
    const run: WorkflowRun = {
      id: "r",
      userId: U,
      templateId: "t",
      status: "assembling",
      currentStepIndex: 1,
      findings: [
        { id: "1", stepId: "s", severity: "RED", title: "Crit", detail: "bad" },
        { id: "2", stepId: "s", severity: "GREEN", title: "Note", detail: "fine" },
      ],
      createdAt: T0,
      updatedAt: T0,
    };
    const doc = fallbackAssemble(run);
    expect(doc).toContain("## Critical (RED)");
    expect(doc).toContain("Crit");
    expect(doc).toContain("## Notes (GREEN)");
    expect(doc).not.toContain("## Review (YELLOW)"); // empty section omitted
  });
});
