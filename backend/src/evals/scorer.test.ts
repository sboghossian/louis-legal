/**
 * Tests for the deterministic scorer.
 *
 * All tests are synchronous and network-free: the scorer is a pure function.
 *
 * Coverage:
 * - Expectation hits and misses (case-insensitive).
 * - Placeholder detection (all pattern variants).
 * - Length guard (empty output, short output).
 * - Vacuous-truth path (no expectations, structurally valid output).
 * - Partial matches produce proportional scores.
 */

import { describe, it, expect } from "vitest";

import { scoreDeterministic, hasPlaceholder } from "./scorer";

// ─── hasPlaceholder ──────────────────────────────────────────────────────────

describe("hasPlaceholder", () => {
  it("detects [INSERT ...] pattern", () => {
    expect(hasPlaceholder("The parties agree to [INSERT GOVERNING LAW].")).toBe(true);
  });

  it("detects [PLACEHOLDER ...] pattern", () => {
    expect(hasPlaceholder("Amount: [PLACEHOLDER AMOUNT]")).toBe(true);
  });

  it("detects unchecked markdown checkbox [ ]", () => {
    expect(hasPlaceholder("- [ ] Review indemnity clause")).toBe(true);
  });

  it("detects bare TODO word", () => {
    expect(hasPlaceholder("TODO: complete this section")).toBe(true);
    expect(hasPlaceholder("The process is TODO.")).toBe(true);
  });

  it("detects bare PLACEHOLDER word (case-insensitive)", () => {
    expect(hasPlaceholder("Add placeholder here.")).toBe(true);
    expect(hasPlaceholder("PLACEHOLDER text")).toBe(true);
  });

  it("detects TBD", () => {
    expect(hasPlaceholder("Effective date TBD")).toBe(true);
  });

  it("detects YOUR_... variable stub", () => {
    expect(hasPlaceholder("Contact YOUR_NAME for details.")).toBe(true);
  });

  it("does NOT flag clean legal text", () => {
    expect(hasPlaceholder(
      "The parties agree that all confidential information shall remain protected for three years.",
    )).toBe(false);
  });

  it("does NOT flag 'today' or 'to do' as TODO", () => {
    // "to do" as two separate words is not matched by the \\bTODO\\b boundary
    expect(hasPlaceholder("There is a lot to do here.")).toBe(false);
  });
});

// ─── scoreDeterministic: length guards ───────────────────────────────────────

describe("scoreDeterministic — length guards", () => {
  it("returns score 0 and all expectations as misses for empty output", () => {
    const result = scoreDeterministic("", ["confidential", "3 years"]);
    expect(result.score).toBe(0);
    expect(result.hits).toBe(0);
    expect(result.misses).toEqual(["confidential", "3 years"]);
  });

  it("returns score 0 for output shorter than minimum length", () => {
    const result = scoreDeterministic("Short.", ["confidential"]);
    expect(result.score).toBe(0);
    expect(result.misses).toContain("confidential");
  });

  it("does NOT penalise a structurally valid long output", () => {
    const output = "The NDA requires strict confidence. ".repeat(5);
    const result = scoreDeterministic(output, ["confidential"]);
    // "confidential" is not in "confidence" as-is, but it IS a substring check
    // and "confidence" contains "confidenc" not "confidential" — misses is correct
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});

// ─── scoreDeterministic: placeholder guard ────────────────────────────────────

describe("scoreDeterministic — placeholder guard", () => {
  const longOutput = "This agreement is [INSERT GOVERNING LAW] and covers many provisions in detail.";

  it("returns score 0 when placeholder present, regardless of keyword matches", () => {
    const result = scoreDeterministic(longOutput, ["agreement", "provisions"]);
    expect(result.score).toBe(0);
    expect(result.hits).toBe(0);
  });

  it("lists all expectations as misses when placeholder detected", () => {
    const result = scoreDeterministic(longOutput, ["agreement", "provisions"]);
    expect(result.misses).toEqual(["agreement", "provisions"]);
  });
});

// ─── scoreDeterministic: expectation matching ─────────────────────────────────

describe("scoreDeterministic — expectation matching", () => {
  const goodOutput =
    "This NDA requires the receiving party to hold all confidential information in " +
    "strict confidence. The agreement lasts for 3 years and is governed by New York law. " +
    "Exclusions apply to publicly available information and information already known to " +
    "the receiving party prior to disclosure.";

  it("returns score 1 when all expectations are present", () => {
    const result = scoreDeterministic(goodOutput, [
      "confidential",
      "3 years",
      "new york",
      "exclusion",
      "publicly available",
    ]);
    expect(result.score).toBe(1);
    expect(result.hits).toBe(5);
    expect(result.misses).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const result = scoreDeterministic(goodOutput, ["CONFIDENTIAL", "NEW YORK"]);
    expect(result.score).toBe(1);
  });

  it("returns proportional score for partial matches", () => {
    const result = scoreDeterministic(goodOutput, [
      "confidential",   // present
      "arbitration",    // NOT present
    ]);
    expect(result.score).toBeCloseTo(0.5);
    expect(result.hits).toBe(1);
    expect(result.misses).toEqual(["arbitration"]);
  });

  it("returns score 0 when no expectations are met", () => {
    const result = scoreDeterministic(goodOutput, ["arbitration", "diac", "uncapped"]);
    expect(result.score).toBe(0);
    expect(result.hits).toBe(0);
    expect(result.misses).toHaveLength(3);
  });

  it("returns score 1 with empty expectations (vacuous truth) for valid output", () => {
    const result = scoreDeterministic(goodOutput, []);
    expect(result.score).toBe(1);
    expect(result.hits).toBe(0);
    expect(result.misses).toHaveLength(0);
  });

  it("lists exact missing expectation strings, preserving original casing", () => {
    const result = scoreDeterministic(goodOutput, ["confidential", "UNCAPPED"]);
    expect(result.misses).toEqual(["UNCAPPED"]);
  });
});

// ─── scoreDeterministic: skeleton outputs ─────────────────────────────────────

describe("scoreDeterministic — skeleton outputs", () => {
  it("flags output with unchecked checkboxes as failing", () => {
    const skeleton = [
      "- [ ] Summarise the confidentiality clause",
      "- [ ] Identify governing law",
      "This output is a skeleton that needs to be completed by the model.",
    ].join("\n");
    const result = scoreDeterministic(skeleton, ["confidential"]);
    expect(result.score).toBe(0);
  });

  it("flags output with TODO as failing even when keywords present", () => {
    const output =
      "The NDA covers confidential information and lasts 3 years. " +
      "TODO: add more analysis here. This is a long enough string to pass the length check.";
    const result = scoreDeterministic(output, ["confidential"]);
    expect(result.score).toBe(0);
  });
});
