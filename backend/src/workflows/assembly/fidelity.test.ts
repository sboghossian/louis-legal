/**
 * Tests for verifyFidelity — mechanical RED-coverage check.
 *
 * All tests are deterministic. The fake LLM never makes real network calls.
 */

import { describe, expect, it, vi } from "vitest";
import { verifyFidelity } from "./fidelity";
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

function makeRun(findings: Finding[]): WorkflowRun {
  return {
    id: "run-1",
    userId: "user-1",
    templateId: "contract-review",
    status: "assembling",
    currentStepIndex: 3,
    findings,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:01:00.000Z",
  };
}

// A deliverable that mentions all our critical findings by name
const FULL_COVERAGE_DOC = `
# Contract Review Deliverable

## Critical Findings

### Unilateral Termination Right

TechVendor retains an unrestricted right to terminate. This is a critical risk.
Immediate negotiation is required to protect continuity of service.

### Uncapped Liability Exposure

The agreement contains uncapped liability exposure for IP indemnification clauses.
This creates unlimited financial risk for Acme Corp.

## Notable Issues

### Ambiguous Cure Period

The cure period language is ambiguous and should be clarified before signing.

## Executive Summary

Two critical findings require attention before execution.
`.trim();

// A deliverable that only mentions one of two RED findings
const PARTIAL_COVERAGE_DOC = `
# Contract Review Deliverable

## Critical Findings

### Unilateral Termination Right

TechVendor retains an unrestricted right to terminate. Recommend 90-day notice.

## Executive Summary

One critical finding identified. Review recommended.
`.trim();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("verifyFidelity", () => {
  it("returns ok:true and redCovered=0 when there are no RED findings", async () => {
    const run = makeRun([
      makeFinding({ severity: "YELLOW", title: "Minor Clause Issue" }),
      makeFinding({ severity: "GREEN", title: "Payment Terms OK" }),
    ]);
    const result = await verifyFidelity(run, FULL_COVERAGE_DOC);
    expect(result.ok).toBe(true);
    expect(result.redTotal).toBe(0);
    expect(result.redCovered).toBe(0);
    expect(result.missing).toHaveLength(0);
  });

  it("returns ok:true when all RED finding titles appear in the deliverable", async () => {
    const run = makeRun([
      makeFinding({ severity: "RED", title: "Unilateral Termination Right" }),
      makeFinding({ severity: "RED", title: "Uncapped Liability Exposure" }),
      makeFinding({ severity: "YELLOW", title: "Ambiguous Cure Period" }),
    ]);
    const result = await verifyFidelity(run, FULL_COVERAGE_DOC);
    expect(result.ok).toBe(true);
    expect(result.redTotal).toBe(2);
    expect(result.redCovered).toBe(2);
    expect(result.missing).toHaveLength(0);
  });

  it("returns ok:false and lists missing titles when a RED finding is not in the doc", async () => {
    const run = makeRun([
      makeFinding({ severity: "RED", title: "Unilateral Termination Right" }),
      makeFinding({ severity: "RED", title: "Uncapped Liability Exposure" }),
    ]);
    // PARTIAL_COVERAGE_DOC only mentions "Unilateral Termination Right"
    const result = await verifyFidelity(run, PARTIAL_COVERAGE_DOC);
    expect(result.ok).toBe(false);
    expect(result.redTotal).toBe(2);
    expect(result.redCovered).toBe(1);
    expect(result.missing).toContain("Uncapped Liability Exposure");
    expect(result.missing).toHaveLength(1);
  });

  it("counts only RED findings — YELLOW/GREEN do not affect coverage", async () => {
    const run = makeRun([
      makeFinding({ severity: "RED", title: "Unilateral Termination Right" }),
      makeFinding({ severity: "YELLOW", title: "Some Yellow Finding XYZ999" }),
      makeFinding({ severity: "GREEN", title: "Another Green Finding ABC888" }),
    ]);
    // Doc mentions the RED but not the others — should still be ok
    const result = await verifyFidelity(run, PARTIAL_COVERAGE_DOC);
    expect(result.ok).toBe(true);
    expect(result.redTotal).toBe(1);
    expect(result.redCovered).toBe(1);
    expect(result.missing).toHaveLength(0);
  });

  it("uses LLM spot-check to rescue a finding that passed the LLM but not mechanical", async () => {
    const run = makeRun([
      // A finding with a short/generic title that might not match mechanically
      makeFinding({ severity: "RED", title: "IP Risk" }),
    ]);
    // Doc does not contain "ip risk" literally
    const docWithoutTitle = "The liability provisions create significant exposure.";

    // Fake LLM that says "yes" (the finding is covered according to it)
    const fakeLlm: LlmComplete = vi.fn().mockResolvedValue("yes");

    const result = await verifyFidelity(run, docWithoutTitle, fakeLlm);
    // LLM said yes, so should be covered
    expect(result.ok).toBe(true);
    expect(result.redCovered).toBe(1);
    expect(result.missing).toHaveLength(0);
    expect(fakeLlm).toHaveBeenCalledOnce();
  });

  it("marks finding as missing when LLM spot-check returns 'no'", async () => {
    const run = makeRun([
      makeFinding({ severity: "RED", title: "Rare Specific Clause XYZ999" }),
    ]);
    const docWithoutTitle = "General review of the contract was completed.";

    const fakeLlm: LlmComplete = vi.fn().mockResolvedValue("no");

    const result = await verifyFidelity(run, docWithoutTitle, fakeLlm);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("Rare Specific Clause XYZ999");
  });

  it("works without LLM — missing finding stays missing", async () => {
    const run = makeRun([
      makeFinding({ severity: "RED", title: "Uncapped Liability Exposure" }),
    ]);
    const result = await verifyFidelity(run, PARTIAL_COVERAGE_DOC);
    // PARTIAL_COVERAGE_DOC does not mention "Uncapped Liability Exposure"
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("Uncapped Liability Exposure");
  });

  it("FidelityResult shape is correct", async () => {
    const run = makeRun([]);
    const result = await verifyFidelity(run, "some doc");
    expect(typeof result.ok).toBe("boolean");
    expect(typeof result.redTotal).toBe("number");
    expect(typeof result.redCovered).toBe("number");
    expect(Array.isArray(result.missing)).toBe(true);
  });
});
