/**
 * Deterministic output scorer — zero LLM, zero network, pure functions.
 *
 * Scoring algorithm
 * ─────────────────
 * 1. Placeholder check  — automatic failure if the output contains unresolved
 *    template tokens (`[INSERT …]`, `TODO`, `PLACEHOLDER`, `[ ]`, etc.).
 *    These indicate the system failed to fill in required content and no amount
 *    of keyword matching should rescue the score.
 *
 * 2. Non-empty / minimum-length guard — empty output or an output shorter than
 *    `MIN_OUTPUT_LENGTH` bytes is treated as a hard failure: score = 0, all
 *    expectations are listed as misses. A one-sentence response to a complex
 *    legal question is never good enough.
 *
 * 3. Expectation matching — each string in `expectations` is searched
 *    case-insensitively in the output. The raw expectation score is
 *    `hits / total` (vacuously 1 when there are no expectations).
 *
 * 4. Combination — the final score is
 *      `placeholderPenalty * lengthPenalty * expectationScore`
 *    where each penalty term is either 0 (hard failure) or 1 (passes).
 *
 * Keeping this as a pure function (not a class) ensures it is trivially
 * testable and composable with other scorers without side effects.
 */

/** Minimum character length for an output to be considered non-trivial. */
const MIN_OUTPUT_LENGTH = 50;

/**
 * Patterns that signal the output contains unresolved template placeholders.
 *
 * Rationale for each entry:
 * - `[INSERT`   / `[PLACEHOLDER` — common bracket-fill patterns in legal templates.
 * - `[ ]`                        — unchecked markdown checkbox (skeleton output).
 * - `TODO`                       — developer or model note left unexpanded.
 * - `PLACEHOLDER`                — explicit marker not enclosed in brackets.
 * - `TBD`                        — "to be determined" filler.
 * - `YOUR_`                      — shell-script or template variable stub.
 *
 * All checks are case-insensitive (handled at call site).
 */
const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /\[INSERT/i,
  /\[PLACEHOLDER/i,
  /\[\s*\]/,          // unchecked checkbox "[ ]"
  /\bTODO\b/i,
  /\bPLACEHOLDER\b/i,
  /\bTBD\b/i,
  /\bYOUR_[A-Z_]+\b/,
];

/**
 * Returns true when the output contains any unresolved placeholder token.
 *
 * Exported so callers can surface the detection result without re-running the
 * full scorer.
 */
export function hasPlaceholder(output: string): boolean {
  return PLACEHOLDER_PATTERNS.some((re) => re.test(output));
}

// ─── Result type ─────────────────────────────────────────────────────────────

/**
 * Raw result of the deterministic scorer.
 *
 * @property hits  - Count of expectations found in the output.
 * @property misses - Expectation strings that were absent (case-insensitive).
 * @property score  - Final combined score in [0, 1].
 */
export interface DeterministicScoreResult {
  readonly hits: number;
  readonly misses: readonly string[];
  readonly score: number;
}

// ─── Core scoring function ───────────────────────────────────────────────────

/**
 * Score an output string against a list of string expectations.
 *
 * This is the **only** exported scoring entry-point. It is intentionally pure:
 * no I/O, no randomness, no closures over mutable state.
 *
 * @param output       - The text produced by the system under test.
 * @param expectations - Keywords or phrases that MUST appear in `output`
 *                       (matched case-insensitively, substring).
 * @returns A {@link DeterministicScoreResult} with hits, misses, and a 0..1 score.
 *
 * @example
 * ```ts
 * const result = scoreDeterministic(
 *   "This NDA protects confidential information for 5 years.",
 *   ["confidential", "5 years"],
 * );
 * // result.score === 1, result.hits === 2, result.misses === []
 * ```
 */
export function scoreDeterministic(
  output: string,
  expectations: readonly string[],
): DeterministicScoreResult {
  // Guard: placeholder penalty (hard failure — score 0).
  if (hasPlaceholder(output)) {
    return {
      hits: 0,
      misses: [...expectations],
      score: 0,
    };
  }

  // Guard: length penalty (hard failure — score 0).
  if (output.trim().length < MIN_OUTPUT_LENGTH) {
    return {
      hits: 0,
      misses: [...expectations],
      score: 0,
    };
  }

  // Expectation matching.
  if (expectations.length === 0) {
    // Vacuous truth: nothing to disprove.  Output passed structural checks.
    return { hits: 0, misses: [], score: 1 };
  }

  const lower = output.toLowerCase();
  const misses: string[] = [];
  let hits = 0;

  for (const expectation of expectations) {
    if (lower.includes(expectation.toLowerCase())) {
      hits++;
    } else {
      misses.push(expectation);
    }
  }

  return {
    hits,
    misses,
    score: hits / expectations.length,
  };
}
