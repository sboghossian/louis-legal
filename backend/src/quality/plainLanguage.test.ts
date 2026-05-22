/**
 * Tests for the plain-language readability scorer (Louis quality suite).
 *
 * All tests are deterministic — no LLM, no network. Numeric assertions use
 * toBeCloseTo / range checks because FK-grade estimates are heuristic.
 */
import { describe, it, expect } from "vitest";

import { scoreReadability, PLAIN_LANGUAGE_GUIDANCE } from "./plainLanguage";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Simple, consumer-grade text — should score low FK grade, few hits. */
const SIMPLE_TEXT =
  "We collect your name and email. We use them to send updates. You can stop at any time.";

/** Dense legalese — should score high FK grade, many jargon hits, passive hits. */
const LEGALESE_TEXT = `
Notwithstanding any other provision of this Agreement to the contrary, in the
event that the Customer fails to remit payment of the applicable fees within
thirty (30) calendar days of the invoice date, the Company shall have the right
to suspend the Customer's access without further notice, pursuant to the terms
and conditions set forth herein, including but not limited to the right to
pursue any and all available legal remedies in accordance with applicable law.

The representations and warranties made herein by each party are deemed to be
made as of the effective date and shall survive the termination of this Agreement
notwithstanding any provisions to the contrary contained in any subsequent
agreements or instruments executed by the parties hereto.
`.trim();

/** A sentence that clearly uses passive voice. */
const PASSIVE_TEXT =
  "The report was prepared by the committee. The findings were reviewed by legal counsel. The contract was signed by both parties.";

// ---------------------------------------------------------------------------
// Grade level
// ---------------------------------------------------------------------------

describe("scoreReadability — gradeLevel", () => {
  it("produces a low grade level for simple text", () => {
    const score = scoreReadability(SIMPLE_TEXT);
    // Consumer-target is FK ≤ 8; simple fixture should be well below 10.
    expect(score.gradeLevel).toBeLessThan(10);
  });

  it("produces a higher grade level for dense legalese", () => {
    const score = scoreReadability(LEGALESE_TEXT);
    // Dense legal text typically scores FK 14–18.
    expect(score.gradeLevel).toBeGreaterThan(12);
  });

  it("grade level is clamped to [0, 18]", () => {
    const score = scoreReadability(LEGALESE_TEXT);
    expect(score.gradeLevel).toBeGreaterThanOrEqual(0);
    expect(score.gradeLevel).toBeLessThanOrEqual(18);
  });

  it("returns 0 for empty string", () => {
    const score = scoreReadability("");
    expect(score.gradeLevel).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Long sentences
// ---------------------------------------------------------------------------

describe("scoreReadability — longSentences", () => {
  it("flags no long sentences in the simple text", () => {
    const score = scoreReadability(SIMPLE_TEXT);
    expect(score.longSentences).toHaveLength(0);
  });

  it("flags the long sentences in legalese text", () => {
    const score = scoreReadability(LEGALESE_TEXT);
    expect(score.longSentences.length).toBeGreaterThan(0);
    // Each flagged sentence should actually exceed 20 words.
    for (const s of score.longSentences) {
      const wc = s.split(/\s+/).filter(Boolean).length;
      expect(wc).toBeGreaterThan(20);
    }
  });

  it("flags a known 30-word sentence", () => {
    const longSentence =
      "The Company reserves the right to modify any and all terms contained herein at any time without prior notice to the Customer or any third party beneficiary whatsoever.";
    const score = scoreReadability(longSentence);
    expect(score.longSentences.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Passive voice
// ---------------------------------------------------------------------------

describe("scoreReadability — passiveHits", () => {
  it("detects passive constructions in the passive fixture", () => {
    const score = scoreReadability(PASSIVE_TEXT);
    expect(score.passiveHits.length).toBeGreaterThan(0);
  });

  it("returns fewer passive hits for the simple text", () => {
    const simpleScore = scoreReadability(SIMPLE_TEXT);
    const passiveScore = scoreReadability(PASSIVE_TEXT);
    expect(simpleScore.passiveHits.length).toBeLessThan(passiveScore.passiveHits.length);
  });
});

// ---------------------------------------------------------------------------
// Jargon detection
// ---------------------------------------------------------------------------

describe("scoreReadability — jargonHits", () => {
  it("finds legalese terms in the legalese fixture", () => {
    const score = scoreReadability(LEGALESE_TEXT);
    expect(score.jargonHits.length).toBeGreaterThan(0);
    // Should find at least: notwithstanding, herein, pursuant to, in accordance with,
    // including but not limited to, representations and warranties, in the event that
    expect(score.jargonHits).toContain("notwithstanding");
    expect(score.jargonHits).toContain("herein");
    expect(score.jargonHits).toContain("pursuant to");
  });

  it("returns no jargon hits for the simple text", () => {
    const score = scoreReadability(SIMPLE_TEXT);
    expect(score.jargonHits).toHaveLength(0);
  });

  it("deduplicate repeated jargon terms", () => {
    const repeated = "Notwithstanding the foregoing, notwithstanding any other clause, notwithstanding.";
    const score = scoreReadability(repeated);
    const count = score.jargonHits.filter((j) => j === "notwithstanding").length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Prompt-pack export
// ---------------------------------------------------------------------------

describe("PLAIN_LANGUAGE_GUIDANCE", () => {
  it("is a non-empty string", () => {
    expect(typeof PLAIN_LANGUAGE_GUIDANCE).toBe("string");
    expect(PLAIN_LANGUAGE_GUIDANCE.length).toBeGreaterThan(100);
  });

  it("contains the word substitution table header", () => {
    expect(PLAIN_LANGUAGE_GUIDANCE).toContain("Word Substitutions");
  });

  it("contains the readability targets table", () => {
    expect(PLAIN_LANGUAGE_GUIDANCE).toContain("Readability Targets");
  });

  it("contains the dual-artifact output format", () => {
    expect(PLAIN_LANGUAGE_GUIDANCE).toContain("Artifact 1");
    expect(PLAIN_LANGUAGE_GUIDANCE).toContain("Artifact 2");
  });
});
