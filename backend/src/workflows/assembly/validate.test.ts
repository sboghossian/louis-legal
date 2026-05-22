/**
 * Tests for validateDeliverable — mechanical structural rejection.
 *
 * All tests are deterministic (no LLM, no network).
 */

import { describe, expect, it } from "vitest";
import { validateDeliverable } from "./validate";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** A realistic multi-section deliverable that should pass all checks. */
const REALISTIC_DOC = `
# Contract Review: Software Services Agreement

## Executive Summary

This review identifies three critical issues and two notable concerns in the Software
Services Agreement dated 15 May 2026 between Acme Corp and TechVendor LLC. The unilateral
termination clause and uncapped liability exposure require immediate legal attention before
execution. The payment terms contain ambiguous cure periods that should be clarified.

## Critical Findings

### Unilateral Termination Right

TechVendor retains an unrestricted right to terminate this Agreement on 24 hours' notice
for any reason or no reason (Clause 12.3). This is highly unusual in a commercial software
services contract and leaves Acme Corp exposed to abrupt service disruption without
adequate transition time. Recommend: require 90-day notice or mutual consent for
termination outside of material breach.

### Uncapped Liability Exposure

Clause 18.2 excludes all liability caps for breaches related to intellectual property
indemnification, leaving Acme Corp with unlimited exposure. Industry standard is a
3x contract value cap even for IP indemnification. Recommend: negotiate a cap of
no less than 3× annual fees.

## Notable Issues

### Ambiguous Cure Period

Clause 9.1 references a "reasonable period" for curing payment defaults without
specifying a number of days. Combined with the 24-hour termination right, this creates
uncertainty. Recommend: insert a minimum 30-day cure period with written notice.

## Recommendations

Address the Critical Findings before signing. Legal counsel should negotiate the
termination notice period, liability cap, and cure-period language as a package.
`.trim();

/** A skeleton doc — headings only, no body. */
const SKELETON_DOC = `
# Contract Review

## Critical Findings

## Notable Issues

## Recommendations
`.trim();

/** A doc with placeholder text. */
const PLACEHOLDER_DOC = `
# Contract Review

## Summary

This agreement was reviewed for compliance. TODO: fill in the key findings here.

The following issues were identified: TBD.

Recommendation: [INSERT RECOMMENDATIONS HERE].
`.trim();

/** A process-dump doc (agent narrating its own steps). */
const PROCESS_DUMP_DOC = `
# Analysis

I will now review the contract. Step 1: I analyzed the termination clause and found
that TechVendor has a unilateral right to terminate on 24 hours' notice. This is
concerning because it leaves the client exposed. Step 2: I examined the liability
provisions and found no cap on IP indemnification exposure. Let me now summarize
my findings for the client.
`.trim();

/** A too-thin doc — under MIN_WORD_COUNT words. */
const TOO_THIN_DOC = "Short. Too short.";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateDeliverable", () => {
  it("ACCEPTS a realistic multi-section document", () => {
    const result = validateDeliverable(REALISTIC_DOC);
    expect(result.ok).toBe(true);
    expect(result.problems).toHaveLength(0);
  });

  it("REJECTS a skeleton document (headings with no body)", () => {
    const result = validateDeliverable(SKELETON_DOC);
    expect(result.ok).toBe(false);
    expect(result.problems.length).toBeGreaterThan(0);
    const combined = result.problems.join(" ").toLowerCase();
    expect(combined).toMatch(/skeleton|heading|body|thin|empty/);
  });

  it("REJECTS a document containing placeholder text", () => {
    const result = validateDeliverable(PLACEHOLDER_DOC);
    expect(result.ok).toBe(false);
    expect(result.problems.length).toBeGreaterThan(0);
    const combined = result.problems.join(" ").toLowerCase();
    expect(combined).toMatch(/placeholder|todo|tbd|insert/);
  });

  it("REJECTS a process-dump document (agent narrating own steps)", () => {
    const result = validateDeliverable(PROCESS_DUMP_DOC);
    expect(result.ok).toBe(false);
    expect(result.problems.length).toBeGreaterThan(0);
    const combined = result.problems.join(" ").toLowerCase();
    expect(combined).toMatch(/process|narrat|step|agent/i);
  });

  it("REJECTS a too-thin document (below word count threshold)", () => {
    const result = validateDeliverable(TOO_THIN_DOC);
    expect(result.ok).toBe(false);
    expect(result.problems.length).toBeGreaterThan(0);
    const combined = result.problems.join(" ").toLowerCase();
    expect(combined).toMatch(/thin|word|minimum/);
  });

  it("returns multiple problems when a doc has multiple issues", () => {
    // Empty doc fails both thin + skeleton
    const result = validateDeliverable("");
    expect(result.ok).toBe(false);
    expect(result.problems.length).toBeGreaterThanOrEqual(1);
  });

  it("ValidationResult shape: ok is boolean, problems is string[]", () => {
    const result = validateDeliverable(REALISTIC_DOC);
    expect(typeof result.ok).toBe("boolean");
    expect(Array.isArray(result.problems)).toBe(true);
  });
});
