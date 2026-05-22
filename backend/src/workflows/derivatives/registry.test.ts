/**
 * Tests for Slice 2e — Derivatives registry.
 *
 * No LLM, no network. All assertions are deterministic over a fixed
 * sample WorkflowRun.
 */

import { describe, it, expect } from "vitest";
import type { WorkflowRun, Finding } from "../types";
import { getDerivative, listDerivatives, DERIVATIVES } from "./registry";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_FINDINGS: Finding[] = [
  {
    id: "f1",
    stepId: "extract-parties",
    severity: "RED",
    title: "Unilateral termination right",
    detail:
      "Clause 12.3 grants the counterparty the right to terminate without cause on 7 days notice, exposing the client to abrupt contract cessation without recourse.",
    citations: ["Clause 12.3", "Clause 14.1"],
  },
  {
    id: "f2",
    stepId: "risk-scan",
    severity: "YELLOW",
    title: "Governing law ambiguity",
    detail:
      "The governing law clause (Clause 20) references 'the laws of the UAE' without specifying whether federal law, ADGM, or DIFC applies. This creates enforcement uncertainty.",
    citations: ["Clause 20"],
  },
  {
    id: "f3",
    stepId: "definitions-check",
    severity: "GREEN",
    title: "Definitions consistent",
    detail:
      "All defined terms are used consistently throughout the agreement. No orphan definitions detected.",
  },
];

const SAMPLE_RUN: WorkflowRun = {
  id: "run-test-001",
  userId: "user-abc",
  templateId: "contract-review",
  status: "done",
  currentStepIndex: 3,
  findings: SAMPLE_FINDINGS,
  input: { matterId: "matter-999", documentRef: "contract_v3.pdf" },
  deliverable:
    "This contract review identified two issues requiring attention. Clause 12.3 poses a significant termination risk. Clause 20 should be clarified to specify the applicable UAE law framework.",
  createdAt: "2026-05-22T08:00:00.000Z",
  updatedAt: "2026-05-22T09:00:00.000Z",
};

const ALL_TYPES = ["client-letter", "summary", "redline", "memo"] as const;

// ---------------------------------------------------------------------------
// getDerivative
// ---------------------------------------------------------------------------

describe("getDerivative", () => {
  it("returns a Derivative for each registered type", () => {
    for (const type of ALL_TYPES) {
      const d = getDerivative(type);
      expect(d).toBeDefined();
      expect(d!.type).toBe(type);
      expect(typeof d!.title).toBe("string");
      expect(d!.title.length).toBeGreaterThan(0);
      expect(typeof d!.buildContext).toBe("function");
    }
  });

  it("returns undefined for an unknown type", () => {
    // Cast to bypass TS — simulates a runtime call from a route param
    const result = getDerivative("unknown-type" as Parameters<typeof getDerivative>[0]);
    expect(result).toBeUndefined();
  });

  it("returns the correct derivative per type", () => {
    expect(getDerivative("client-letter")!.type).toBe("client-letter");
    expect(getDerivative("summary")!.type).toBe("summary");
    expect(getDerivative("redline")!.type).toBe("redline");
    expect(getDerivative("memo")!.type).toBe("memo");
  });
});

// ---------------------------------------------------------------------------
// listDerivatives
// ---------------------------------------------------------------------------

describe("listDerivatives", () => {
  it("returns exactly 4 derivatives", () => {
    expect(listDerivatives()).toHaveLength(4);
  });

  it("covers all four registered types", () => {
    const types = listDerivatives().map(d => d.type);
    for (const t of ALL_TYPES) {
      expect(types).toContain(t);
    }
  });

  it("returns a fresh array on each call (not the registry object reference)", () => {
    const a = listDerivatives();
    const b = listDerivatives();
    expect(a).not.toBe(b);
    // But contents should be equal
    expect(a.map(d => d.type).sort()).toEqual(b.map(d => d.type).sort());
  });

  it("each entry has a non-empty title and a buildContext function", () => {
    for (const d of listDerivatives()) {
      expect(d.title.length).toBeGreaterThan(0);
      expect(typeof d.buildContext).toBe("function");
    }
  });
});

// ---------------------------------------------------------------------------
// buildContext — per-derivative assertions on the sample run
// ---------------------------------------------------------------------------

describe("buildContext on a completed WorkflowRun", () => {
  it("client-letter: returns non-empty systemPrompt and user that reference findings", () => {
    const d = getDerivative("client-letter")!;
    const ctx = d.buildContext(SAMPLE_RUN);
    expect(ctx.systemPrompt.length).toBeGreaterThan(20);
    expect(ctx.user.length).toBeGreaterThan(20);
    // Must reference at least the RED finding title
    expect(ctx.user).toContain("Unilateral termination right");
    // Must reference the template
    expect(ctx.user).toContain("contract-review");
  });

  it("summary: returns non-empty systemPrompt and user that reference findings", () => {
    const d = getDerivative("summary")!;
    const ctx = d.buildContext(SAMPLE_RUN);
    expect(ctx.systemPrompt.length).toBeGreaterThan(20);
    expect(ctx.user.length).toBeGreaterThan(20);
    expect(ctx.user).toContain("Unilateral termination right");
    // Should note the overall risk level
    expect(ctx.user).toContain("HIGH");
  });

  it("redline: returns non-empty systemPrompt and user that reference findings", () => {
    const d = getDerivative("redline")!;
    const ctx = d.buildContext(SAMPLE_RUN);
    expect(ctx.systemPrompt.length).toBeGreaterThan(20);
    expect(ctx.user.length).toBeGreaterThan(20);
    expect(ctx.user).toContain("Unilateral termination right");
    // Should reference the citation
    expect(ctx.user).toContain("Clause 12.3");
  });

  it("memo: returns non-empty systemPrompt and user that reference findings", () => {
    const d = getDerivative("memo")!;
    const ctx = d.buildContext(SAMPLE_RUN);
    expect(ctx.systemPrompt.length).toBeGreaterThan(20);
    expect(ctx.user.length).toBeGreaterThan(20);
    expect(ctx.user).toContain("Unilateral termination right");
    expect(ctx.user).toContain("Governing law ambiguity");
    expect(ctx.user).toContain("contract-review");
  });

  it("all derivatives include the deliverable excerpt in user context", () => {
    for (const type of ALL_TYPES) {
      const ctx = getDerivative(type)!.buildContext(SAMPLE_RUN);
      // The deliverable text is in the run and should appear in the user prompt
      expect(ctx.user).toContain("Clause 12.3 poses a significant termination risk");
    }
  });

  it("is deterministic — same run yields identical output on repeated calls", () => {
    for (const type of ALL_TYPES) {
      const d = getDerivative(type)!;
      const a = d.buildContext(SAMPLE_RUN);
      const b = d.buildContext(SAMPLE_RUN);
      expect(a.systemPrompt).toBe(b.systemPrompt);
      expect(a.user).toBe(b.user);
      expect(a.maxTokens).toBe(b.maxTokens);
    }
  });

  it("buildContext on a run with no findings produces non-empty prompts", () => {
    const emptyRun: WorkflowRun = {
      ...SAMPLE_RUN,
      findings: [],
      deliverable: undefined,
    };
    for (const type of ALL_TYPES) {
      const ctx = getDerivative(type)!.buildContext(emptyRun);
      expect(ctx.systemPrompt.length).toBeGreaterThan(0);
      expect(ctx.user.length).toBeGreaterThan(0);
    }
  });

  it("maxTokens, when set, is a positive integer", () => {
    for (const type of ALL_TYPES) {
      const ctx = getDerivative(type)!.buildContext(SAMPLE_RUN);
      if (ctx.maxTokens !== undefined) {
        expect(typeof ctx.maxTokens).toBe("number");
        expect(ctx.maxTokens).toBeGreaterThan(0);
        expect(Number.isInteger(ctx.maxTokens)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// DERIVATIVES constant
// ---------------------------------------------------------------------------

describe("DERIVATIVES constant", () => {
  it("has exactly the four expected keys", () => {
    const keys = Object.keys(DERIVATIVES).sort();
    expect(keys).toEqual(["client-letter", "memo", "redline", "summary"]);
  });
});
