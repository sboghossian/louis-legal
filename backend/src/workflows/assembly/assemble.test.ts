/**
 * Tests for assembleDeliverable and orderFindings.
 *
 * Uses a fake LLM — NO real API/network calls.
 */

import { describe, expect, it, vi } from "vitest";
import { assembleDeliverable, orderFindings } from "./assemble";
import type { WorkflowRun, Finding } from "../types";
import type { LlmComplete } from "../contracts";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeFinding(overrides: Partial<Finding> & { severity: Finding["severity"] }): Finding {
  return {
    id: overrides.id ?? `f-${Math.random().toString(36).slice(2)}`,
    stepId: overrides.stepId ?? "step-1",
    severity: overrides.severity,
    title: overrides.title ?? "Unnamed Finding",
    detail: overrides.detail ?? "No detail provided.",
    citations: overrides.citations,
  };
}

function makeRun(findings: Finding[], input?: Record<string, unknown>): WorkflowRun {
  return {
    id: "run-1",
    userId: "user-1",
    templateId: "contract-review",
    status: "assembling",
    currentStepIndex: 3,
    findings,
    input,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:01:00.000Z",
  };
}

// ---------------------------------------------------------------------------
// Fake LLM
// ---------------------------------------------------------------------------

/**
 * Fake LLM that returns a realistic-looking deliverable and records the
 * call params so we can assert on them.
 */
function makeFakeLlm(response?: string): LlmComplete {
  const defaultResponse = `# Contract Review: Software Services Agreement

## Executive Summary

This review identifies two critical findings requiring immediate attention before execution.

## Critical Findings

### Unilateral Termination Right

TechVendor retains an unrestricted right to terminate on 24 hours' notice (Clause 12.3).
This is highly unusual and leaves Acme Corp exposed to abrupt service disruption.
Recommendation: Require minimum 90-day notice period.

### Uncapped Liability Exposure

Clause 18.2 excludes all liability caps for IP indemnification, creating unlimited
financial exposure. Recommendation: Negotiate a cap of 3× annual fees.

## Recommendations

Address both Critical Findings before signing. Legal counsel should negotiate
as a package to maximise leverage.`;

  return vi.fn().mockResolvedValue(response ?? defaultResponse);
}

// ---------------------------------------------------------------------------
// Tests: assembleDeliverable
// ---------------------------------------------------------------------------

describe("assembleDeliverable", () => {
  it("calls the LLM and returns its output (non-empty string)", async () => {
    const run = makeRun([
      makeFinding({ severity: "RED", title: "Unilateral Termination Right", detail: "Clause 12.3 permits termination without cause." }),
      makeFinding({ severity: "YELLOW", title: "Ambiguous Cure Period", detail: "No specific number of days." }),
      makeFinding({ severity: "GREEN", title: "Payment Terms Acceptable", detail: "Standard net-30 terms." }),
    ]);
    const fakeLlm = makeFakeLlm();
    const result = await assembleDeliverable(run, fakeLlm);

    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(fakeLlm).toHaveBeenCalledOnce();
  });

  it("includes all findings (RED, YELLOW, GREEN) in the LLM prompt", async () => {
    const run = makeRun([
      makeFinding({ severity: "RED", title: "Unilateral Termination Right", detail: "Risk detail here." }),
      makeFinding({ severity: "YELLOW", title: "Ambiguous Cure Period", detail: "Yellow detail." }),
      makeFinding({ severity: "GREEN", title: "Payment Terms OK", detail: "Green detail." }),
    ]);

    const fakeLlm: LlmComplete = vi.fn().mockResolvedValue("assembled deliverable");
    await assembleDeliverable(run, fakeLlm);

    const callArgs = (fakeLlm as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      user: string;
      systemPrompt?: string;
    };

    // All finding titles should appear in the prompt
    expect(callArgs.user).toContain("Unilateral Termination Right");
    expect(callArgs.user).toContain("Ambiguous Cure Period");
    expect(callArgs.user).toContain("Payment Terms OK");
  });

  it("includes run input context in the LLM prompt when provided", async () => {
    const run = makeRun(
      [makeFinding({ severity: "RED", title: "Termination Risk", detail: "Detail." })],
      { matterId: "matter-42", documentRef: "doc-99" },
    );
    const fakeLlm: LlmComplete = vi.fn().mockResolvedValue("deliverable text");
    await assembleDeliverable(run, fakeLlm);

    const callArgs = (fakeLlm as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      user: string;
    };
    expect(callArgs.user).toContain("matter-42");
    expect(callArgs.user).toContain("doc-99");
  });

  it("passes templateId to the LLM prompt", async () => {
    const run = makeRun([makeFinding({ severity: "RED", title: "Some Finding", detail: "Detail." })]);
    const fakeLlm: LlmComplete = vi.fn().mockResolvedValue("result");
    await assembleDeliverable(run, fakeLlm);

    const callArgs = (fakeLlm as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      user: string;
    };
    expect(callArgs.user).toContain("contract-review");
  });

  it("works with an empty findings list (no findings run)", async () => {
    const run = makeRun([]);
    const fakeLlm = makeFakeLlm("No findings were produced by this workflow run.");
    const result = await assembleDeliverable(run, fakeLlm);
    expect(typeof result).toBe("string");
    expect(fakeLlm).toHaveBeenCalledOnce();
  });

  it("system prompt instructs LLM to address RED findings by name", async () => {
    const run = makeRun([makeFinding({ severity: "RED", title: "IP Risk", detail: "Detail." })]);
    const fakeLlm: LlmComplete = vi.fn().mockResolvedValue("result");
    await assembleDeliverable(run, fakeLlm);

    const callArgs = (fakeLlm as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      systemPrompt?: string;
    };
    expect(callArgs.systemPrompt).toBeDefined();
    // System prompt should mention RED finding requirement
    expect(callArgs.systemPrompt?.toLowerCase()).toMatch(/red/);
  });
});

// ---------------------------------------------------------------------------
// Tests: orderFindings (pure helper)
// ---------------------------------------------------------------------------

describe("orderFindings", () => {
  it("orders RED before YELLOW before GREEN", () => {
    const findings = [
      makeFinding({ severity: "GREEN", title: "Green 1" }),
      makeFinding({ severity: "RED", title: "Red 1" }),
      makeFinding({ severity: "YELLOW", title: "Yellow 1" }),
      makeFinding({ severity: "RED", title: "Red 2" }),
    ];
    const ordered = orderFindings(findings);
    const severities = ordered.map((f) => f.severity);
    // All REDs first
    expect(severities[0]).toBe("RED");
    expect(severities[1]).toBe("RED");
    // Then YELLOW
    expect(severities[2]).toBe("YELLOW");
    // Then GREEN
    expect(severities[3]).toBe("GREEN");
  });

  it("does not mutate the original array", () => {
    const findings = [
      makeFinding({ severity: "GREEN", title: "G" }),
      makeFinding({ severity: "RED", title: "R" }),
    ];
    const original = [...findings];
    orderFindings(findings);
    expect(findings[0].severity).toBe(original[0].severity);
    expect(findings[1].severity).toBe(original[1].severity);
  });

  it("handles an empty array", () => {
    expect(orderFindings([])).toHaveLength(0);
  });

  it("preserves order within the same severity", () => {
    const findings = [
      makeFinding({ id: "r1", severity: "RED", title: "Red First" }),
      makeFinding({ id: "r2", severity: "RED", title: "Red Second" }),
    ];
    const ordered = orderFindings(findings);
    expect(ordered[0].id).toBe("r1");
    expect(ordered[1].id).toBe("r2");
  });
});
