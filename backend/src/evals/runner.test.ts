/**
 * Tests for the eval runner.
 *
 * All tests use:
 * - Fake `produce` functions (no network, no LLM).
 * - Fake `judge` implementations returning fixed scores.
 *
 * Coverage:
 * - Single good output → score 1, passed.
 * - Skeleton/poor output → score 0, failed.
 * - Mixed suite → correct meanScore and passRate.
 * - Judge blending: final score = (deterministic + judge) / 2.
 * - Empty suite → meanScore 0, passRate 0, results [].
 * - Judge notes flow through to breakdown.
 */

import { describe, it, expect, vi } from "vitest";

import { runEval, PASS_THRESHOLD } from "./runner";
import type { EvalCase, Judge } from "./types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A structurally valid, expectation-satisfying NDA summary. */
const GOOD_OUTPUT =
  "This NDA requires strict confidence. The confidential information is protected " +
  "for 3 years and governed by New York law. Exclusions include publicly available " +
  "information and information already known to the receiving party. No disclosure " +
  "to third parties without prior written consent.";

/** A skeleton output that will be caught by the placeholder guard. */
const SKELETON_OUTPUT =
  "- [ ] Summarise the confidentiality clause\n" +
  "- [ ] Identify governing law\n" +
  "TODO: complete this analysis.";

const BASE_CASE: EvalCase = {
  id: "test-good",
  input: "Summarise the NDA.",
  expectations: ["confidential", "3 years", "new york"],
};

const SKELETON_CASE: EvalCase = {
  id: "test-skeleton",
  input: "Summarise the NDA.",
  expectations: ["confidential", "3 years"],
};

// ─── Single-case runs ─────────────────────────────────────────────────────────

describe("runEval — single good case", () => {
  it("produces score 1 and passed:true for a fully-matching output", async () => {
    const produce = vi.fn().mockResolvedValue(GOOD_OUTPUT);
    const report = await runEval([BASE_CASE], produce);

    expect(report.results).toHaveLength(1);
    const r = report.results[0];
    expect(r.id).toBe("test-good");
    expect(r.score).toBe(1);
    expect(r.passed).toBe(true);
    expect(r.breakdown.hits).toBe(3);
    expect(r.breakdown.misses).toHaveLength(0);
  });

  it("produces score 0 and passed:false for a skeleton output", async () => {
    const produce = vi.fn().mockResolvedValue(SKELETON_OUTPUT);
    const report = await runEval([SKELETON_CASE], produce);

    const r = report.results[0];
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
    expect(r.breakdown.deterministicScore).toBe(0);
  });
});

// ─── Aggregation ──────────────────────────────────────────────────────────────

describe("runEval — aggregation over mixed suite", () => {
  it("computes correct meanScore and passRate", async () => {
    const cases: readonly EvalCase[] = [
      { id: "good", input: "input-a", expectations: ["confidential"] },
      { id: "bad",  input: "input-b", expectations: ["uncapped"] },
    ];

    // "input-a" → good output; "input-b" → skeleton (fail)
    const produce = vi.fn().mockImplementation((input: string) =>
      Promise.resolve(
        input === "input-a"
          ? "The confidential information must be protected carefully for many years."
          : SKELETON_OUTPUT,
      ),
    );

    const report = await runEval(cases, produce);

    expect(report.results).toHaveLength(2);
    // good case: score 1, bad case: score 0 → mean = 0.5
    expect(report.meanScore).toBeCloseTo(0.5);
    // Only 1 of 2 passed → passRate = 0.5
    expect(report.passRate).toBeCloseTo(0.5);
  });

  it("returns meanScore 0 and passRate 0 for empty suite", async () => {
    const produce = vi.fn();
    const report = await runEval([], produce);

    expect(report.meanScore).toBe(0);
    expect(report.passRate).toBe(0);
    expect(report.results).toHaveLength(0);
    expect(produce).not.toHaveBeenCalled();
  });
});

// ─── PASS_THRESHOLD ───────────────────────────────────────────────────────────

describe("runEval — pass threshold", () => {
  it(`passes cases at exactly PASS_THRESHOLD (${PASS_THRESHOLD})`, async () => {
    // 7/10 expectations matched → score = 0.7 = PASS_THRESHOLD → passed.
    // Use distinct multi-word phrases so substring matching cannot double-count.
    const expectations = [
      "indemnity cap",   // present
      "force majeure",   // present
      "governing law",   // present
      "cure period",     // present
      "arbitration seat", // present
      "liquidated damages", // present
      "notice clause",   // present
      "entire agreement", // NOT present
      "waiver clause",   // NOT present
      "severability",    // NOT present
    ];
    const output =
      "This contract contains an indemnity cap, a force majeure provision, a governing law " +
      "clause, a cure period for breach, an arbitration seat in Dubai, liquidated damages for " +
      "delay, and a notice clause. It is otherwise a standard commercial agreement.";

    const evalCase: EvalCase = { id: "threshold-test", input: "x", expectations };
    const produce = vi.fn().mockResolvedValue(output);
    const report = await runEval([evalCase], produce);

    expect(report.results[0].score).toBeCloseTo(0.7);
    expect(report.results[0].passed).toBe(true);
  });

  it("fails cases just below PASS_THRESHOLD", async () => {
    // 6/10 expectations matched → score = 0.6 < PASS_THRESHOLD → failed.
    const expectations = [
      "indemnity cap",    // present
      "force majeure",    // present
      "governing law",    // present
      "cure period",      // present
      "arbitration seat", // present
      "liquidated damages", // present
      "entire agreement", // NOT present
      "waiver clause",    // NOT present
      "severability",     // NOT present
      "notice clause",    // NOT present
    ];
    const output =
      "This contract contains an indemnity cap, a force majeure provision, a governing law " +
      "clause, a cure period for breach, an arbitration seat in Dubai, and liquidated damages " +
      "for delay. It is otherwise a standard commercial agreement.";

    const evalCase: EvalCase = { id: "below-threshold", input: "x", expectations };
    const produce = vi.fn().mockResolvedValue(output);
    const report = await runEval([evalCase], produce);

    expect(report.results[0].score).toBeCloseTo(0.6);
    expect(report.results[0].passed).toBe(false);
  });
});

// ─── Judge blending ───────────────────────────────────────────────────────────

describe("runEval — judge blending", () => {
  it("blends deterministic and judge scores equally", async () => {
    // Deterministic: all expectations hit → score 1.0
    // Judge: returns 0.6
    // Expected blend: (1.0 + 0.6) / 2 = 0.8
    const fakeJudge: Judge = vi.fn().mockResolvedValue({
      score: 0.6,
      notes: "Mostly good but missing depth on exclusions.",
    });

    const produce = vi.fn().mockResolvedValue(GOOD_OUTPUT);
    const report = await runEval([BASE_CASE], produce, { judge: fakeJudge });

    const r = report.results[0];
    expect(r.breakdown.deterministicScore).toBe(1);
    expect(r.breakdown.judgeScore).toBeCloseTo(0.6);
    expect(r.score).toBeCloseTo(0.8);
    expect(r.passed).toBe(true); // 0.8 >= 0.7
  });

  it("propagates judge notes into breakdown", async () => {
    const notes = "Strong coverage of key terms.";
    const fakeJudge: Judge = vi.fn().mockResolvedValue({ score: 1, notes });

    const produce = vi.fn().mockResolvedValue(GOOD_OUTPUT);
    const report = await runEval([BASE_CASE], produce, { judge: fakeJudge });

    expect(report.results[0].breakdown.judgeNotes).toBe(notes);
  });

  it("omits judgeScore and judgeNotes when no judge is provided", async () => {
    const produce = vi.fn().mockResolvedValue(GOOD_OUTPUT);
    const report = await runEval([BASE_CASE], produce);

    const r = report.results[0];
    expect(r.breakdown.judgeScore).toBeUndefined();
    expect(r.breakdown.judgeNotes).toBeUndefined();
  });

  it("calls judge with the original input and the produced output", async () => {
    const fakeJudge: Judge = vi.fn().mockResolvedValue({ score: 1, notes: "" });
    const produce = vi.fn().mockResolvedValue(GOOD_OUTPUT);

    await runEval([BASE_CASE], produce, { judge: fakeJudge });

    expect(fakeJudge).toHaveBeenCalledWith({
      input: BASE_CASE.input,
      output: GOOD_OUTPUT,
      expectations: BASE_CASE.expectations,
    });
  });

  it("can push a borderline case over the pass threshold", async () => {
    // Deterministic: 0/3 expectations met (bad output) → score 0
    // Judge: returns 1.0 (it sees different quality signals)
    // Blend: (0 + 1) / 2 = 0.5 → still fails (< 0.7)
    // This tests that the blend works correctly and does not pass a bad case via judge alone.
    const badOutput =
      "The document is a legal contract between two companies. " +
      "It contains various clauses about business matters.";
    const fakeJudge: Judge = vi.fn().mockResolvedValue({ score: 1.0, notes: "Good." });

    const produce = vi.fn().mockResolvedValue(badOutput);
    const report = await runEval([BASE_CASE], produce, { judge: fakeJudge });

    // deterministic = 0 (none of ["confidential", "3 years", "new york"] in badOutput)
    // judge = 1.0
    // blend = 0.5 < PASS_THRESHOLD
    expect(report.results[0].score).toBeCloseTo(0.5);
    expect(report.results[0].passed).toBe(false);
  });
});

// ─── Seed cases smoke test ────────────────────────────────────────────────────

describe("runEval — seed cases with fake produce", () => {
  it("runs the full seed suite with a passthrough produce and returns a report", async () => {
    const { allSeedCases } = await import("./cases/index");

    // A produce that echoes the input — unlikely to hit all expectations but
    // should not throw.
    const produce = (input: string) => Promise.resolve(input);
    const report = await runEval(allSeedCases, produce);

    expect(report.results).toHaveLength(allSeedCases.length);
    expect(report.meanScore).toBeGreaterThanOrEqual(0);
    expect(report.meanScore).toBeLessThanOrEqual(1);
    expect(report.passRate).toBeGreaterThanOrEqual(0);
    expect(report.passRate).toBeLessThanOrEqual(1);
  });
});
