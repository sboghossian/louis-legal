/**
 * Slice 2c — fullBench.ts unit tests.
 *
 * All LLM calls are intercepted by a fake `LlmComplete`. No real API calls.
 */

import { describe, it, expect } from "vitest";
import { runFullBench } from "./fullBench";
import type { LlmComplete } from "./contracts";
import type { Finding } from "./types";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeRed(id: string, title = `RED finding ${id}`): Finding {
  return {
    id,
    stepId: "step-1",
    severity: "RED",
    title,
    detail: `Detail for finding ${id}`,
  };
}

function makeYellow(id: string): Finding {
  return {
    id,
    stepId: "step-1",
    severity: "YELLOW",
    title: `YELLOW finding ${id}`,
    detail: `Detail for finding ${id}`,
  };
}

function makeGreen(id: string): Finding {
  return {
    id,
    stepId: "step-1",
    severity: "GREEN",
    title: `GREEN finding ${id}`,
    detail: `Detail for finding ${id}`,
  };
}

// ---------------------------------------------------------------------------
// Fake LLM factories
// ---------------------------------------------------------------------------

/**
 * A sequenced fake: returns responses in order regardless of prompt content.
 * 3 calls per finding: Challenger → Defender → Evaluator.
 */
function makeSequencedLlm(responses: string[]): LlmComplete {
  let idx = 0;
  return async () => responses[idx++ % responses.length];
}

/**
 * A role-aware fake: branches on prompt content keywords.
 * Used to simulate specific verdict shapes.
 */
function makeRoleAwareLlm(opts: {
  challengerReply: string;
  defenderReply: string;
  evaluatorReply: string;
}): LlmComplete {
  return async ({ user }) => {
    const u = user.toLowerCase();
    if (u.includes("role: challenger") || u.includes("your role: challenger")) {
      return opts.challengerReply;
    }
    if (u.includes("role: defender") || u.includes("your role: defender")) {
      return opts.defenderReply;
    }
    // Evaluator
    return opts.evaluatorReply;
  };
}

// Canned evaluator responses for each verdict kind
const UPHELD_EVAL = `VERDICT: upheld
CONFIDENCE: 0.9
RATIONALE: The finding is well-supported; the challenge did not undermine the core claim.`;

const REVISED_EVAL = `VERDICT: revised
CONFIDENCE: 0.75
RATIONALE: Partially correct but overstated — the clause is one-sided, not unilateral.
REVISED: The termination clause is one-sided and favours the licensor, creating imbalance.`;

const WITHDRAWN_EVAL = `VERDICT: withdrawn
CONFIDENCE: 0.85
RATIONALE: The challenger demonstrated the cited clause was already deleted in Amendment 3.`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runFullBench", () => {
  it("returns a verdict for a single RED finding with confidence in [0,1]", async () => {
    const llm = makeRoleAwareLlm({
      challengerReply: "This clause is standard boilerplate.",
      defenderReply: "Standard or not, it is still asymmetric.",
      evaluatorReply: UPHELD_EVAL,
    });

    const verdicts = await runFullBench([makeRed("f1")], llm);

    expect(verdicts).toHaveLength(1);
    const v = verdicts[0];
    expect(v.findingId).toBe("f1");
    expect(v.verdict).toBe("upheld");
    expect(v.confidence).toBeGreaterThanOrEqual(0);
    expect(v.confidence).toBeLessThanOrEqual(1);
    expect(v.rationale.length).toBeGreaterThan(0);
    expect(v.revised).toBeUndefined();
  });

  it("produces verdict=upheld and no revised field", async () => {
    const llm = makeRoleAwareLlm({
      challengerReply: "Challenge text.",
      defenderReply: "Defense text.",
      evaluatorReply: UPHELD_EVAL,
    });

    const [v] = await runFullBench([makeRed("f-upheld")], llm);
    expect(v.verdict).toBe("upheld");
    expect(v.revised).toBeUndefined();
  });

  it("produces verdict=revised and sets revised field", async () => {
    const llm = makeRoleAwareLlm({
      challengerReply: "Overstated claim.",
      defenderReply: "Not entirely overstated.",
      evaluatorReply: REVISED_EVAL,
    });

    const [v] = await runFullBench([makeRed("f-revised")], llm);
    expect(v.verdict).toBe("revised");
    expect(typeof v.revised).toBe("string");
    expect((v.revised ?? "").length).toBeGreaterThan(0);
    expect(v.confidence).toBeGreaterThanOrEqual(0);
    expect(v.confidence).toBeLessThanOrEqual(1);
  });

  it("produces verdict=withdrawn and no revised field", async () => {
    const llm = makeRoleAwareLlm({
      challengerReply: "Clause removed in Amendment 3.",
      defenderReply: "I see no amendment in the file provided.",
      evaluatorReply: WITHDRAWN_EVAL,
    });

    const [v] = await runFullBench([makeRed("f-withdrawn")], llm);
    expect(v.verdict).toBe("withdrawn");
    expect(v.revised).toBeUndefined();
    expect(v.confidence).toBeCloseTo(0.85, 2);
  });

  it("skips non-RED findings — YELLOW returns empty verdicts", async () => {
    const llm = makeSequencedLlm(["challenge", "defense", UPHELD_EVAL]);
    const verdicts = await runFullBench([makeYellow("y1"), makeYellow("y2")], llm);
    expect(verdicts).toHaveLength(0);
  });

  it("skips non-RED findings — GREEN returns empty verdicts", async () => {
    const llm = makeSequencedLlm(["challenge", "defense", UPHELD_EVAL]);
    const verdicts = await runFullBench([makeGreen("g1")], llm);
    expect(verdicts).toHaveLength(0);
  });

  it("skips non-RED findings even when mixed with RED", async () => {
    // 1 RED, 2 non-RED → only 1 verdict expected
    let callCount = 0;
    const llm: LlmComplete = async () => {
      callCount++;
      if (callCount % 3 === 0) return UPHELD_EVAL;
      return "some text";
    };

    const findings: Finding[] = [
      makeYellow("y1"),
      makeRed("r1"),
      makeGreen("g1"),
    ];

    const verdicts = await runFullBench(findings, llm);
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0].findingId).toBe("r1");
  });

  it("respects cap: 5 RED findings + cap 3 → exactly 3 verdicts", async () => {
    let callCount = 0;
    const llm: LlmComplete = async () => {
      callCount++;
      if (callCount % 3 === 0) return UPHELD_EVAL;
      return "some text";
    };

    const fiveRed = Array.from({ length: 5 }, (_, i) => makeRed(`r${i + 1}`));
    const verdicts = await runFullBench(fiveRed, llm, { cap: 3 });

    expect(verdicts).toHaveLength(3);
    // Only the first 3 RED findings benched
    expect(verdicts.map((v) => v.findingId)).toEqual(["r1", "r2", "r3"]);
  });

  it("respects cap=1: only first RED finding is benched", async () => {
    let callCount = 0;
    const llm: LlmComplete = async () => {
      callCount++;
      if (callCount % 3 === 0) return UPHELD_EVAL;
      return "some text";
    };

    const threeRed = Array.from({ length: 3 }, (_, i) => makeRed(`r${i + 1}`));
    const verdicts = await runFullBench(threeRed, llm, { cap: 1 });

    expect(verdicts).toHaveLength(1);
    expect(verdicts[0].findingId).toBe("r1");
  });

  it("uses default cap of 3 when opts is omitted", async () => {
    let callCount = 0;
    const llm: LlmComplete = async () => {
      callCount++;
      if (callCount % 3 === 0) return UPHELD_EVAL;
      return "some text";
    };

    const tenRed = Array.from({ length: 10 }, (_, i) => makeRed(`r${i + 1}`));
    const verdicts = await runFullBench(tenRed, llm);
    expect(verdicts).toHaveLength(3);
  });

  it("uses default cap of 3 when opts is empty object", async () => {
    let callCount = 0;
    const llm: LlmComplete = async () => {
      callCount++;
      if (callCount % 3 === 0) return UPHELD_EVAL;
      return "some text";
    };

    const tenRed = Array.from({ length: 10 }, (_, i) => makeRed(`r${i + 1}`));
    const verdicts = await runFullBench(tenRed, llm, {});
    expect(verdicts).toHaveLength(3);
  });

  it("clamps confidence to [0,1] for out-of-range Evaluator output", async () => {
    const highConfidenceEval = `VERDICT: upheld
CONFIDENCE: 1.5
RATIONALE: Very confident.`;

    const lowConfidenceEval = `VERDICT: withdrawn
CONFIDENCE: -0.3
RATIONALE: Very unconfident.`;

    const responses = [
      "challenge",
      "defense",
      highConfidenceEval,
      "challenge",
      "defense",
      lowConfidenceEval,
    ];
    const llm = makeSequencedLlm(responses);

    const findings = [makeRed("r1"), makeRed("r2")];
    const verdicts = await runFullBench(findings, llm, { cap: 2 });

    expect(verdicts[0].confidence).toBeLessThanOrEqual(1);
    expect(verdicts[0].confidence).toBeGreaterThanOrEqual(0);
    expect(verdicts[1].confidence).toBeLessThanOrEqual(1);
    expect(verdicts[1].confidence).toBeGreaterThanOrEqual(0);
  });

  it("returns empty array when given no findings", async () => {
    const llm = makeSequencedLlm(["should not be called"]);
    const verdicts = await runFullBench([], llm);
    expect(verdicts).toHaveLength(0);
  });

  it("preserves findingId in each verdict", async () => {
    let callCount = 0;
    const llm: LlmComplete = async () => {
      callCount++;
      if (callCount % 3 === 0) return UPHELD_EVAL;
      return "some text";
    };

    const findings = [makeRed("alpha"), makeRed("beta"), makeRed("gamma")];
    const verdicts = await runFullBench(findings, llm, { cap: 3 });

    expect(verdicts.map((v) => v.findingId)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("handles malformed Evaluator output gracefully (no crash, defaults to upheld)", async () => {
    const llm = makeSequencedLlm([
      "challenge",
      "defense",
      "This is completely unparseable garbage with no structure at all.",
    ]);

    const verdicts = await runFullBench([makeRed("r1")], llm);
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0].confidence).toBeGreaterThanOrEqual(0);
    expect(verdicts[0].confidence).toBeLessThanOrEqual(1);
    expect(typeof verdicts[0].rationale).toBe("string");
    // Should not throw, should return some verdict
    expect(["upheld", "revised", "withdrawn"]).toContain(verdicts[0].verdict);
  });
});
