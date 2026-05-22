/**
 * Core type contracts for the Louis output-quality eval harness.
 *
 * Design notes
 * ─────────────
 * - `EvalCase` is the unit of authorship: an input, a set of keyword/structural
 *   expectations that MUST appear in the output, and an optional natural-language
 *   rubric that a human or LLM judge can reason about.
 * - `EvalResult` captures everything produced for a single case: the numeric
 *   0..1 score, the pass/fail verdict, and a structured breakdown so failures are
 *   actionable without reading raw logs.
 * - `EvalReport` is the aggregate returned by `runEval` — the numbers a
 *   dashboard or CI gate should care about.
 * - `Judge` is the seam for injecting an LLM-backed evaluator without coupling
 *   the pure runner to any network library. It receives the same triple
 *   (input, output, expectations) the deterministic scorer sees, so downstream
 *   blending is straightforward.
 */

// ─── Case authoring ─────────────────────────────────────────────────────────

/**
 * A single evaluation case authored as a TS fixture.
 *
 * @property id           - Stable identifier used in reports and logs.
 * @property input        - The text sent to the system under test (e.g. document
 *                          to summarise, clause to analyse).
 * @property expectations - Keyword strings that MUST appear in the output
 *                          (case-insensitive). Each missing keyword reduces the
 *                          deterministic score proportionally.
 * @property rubric       - Optional free-text rubric for a human or LLM judge
 *                          to reason about quality beyond keyword matching.
 */
export interface EvalCase {
  readonly id: string;
  readonly input: string;
  readonly expectations: readonly string[];
  readonly rubric?: string;
}

// ─── Per-case result ─────────────────────────────────────────────────────────

/**
 * Detailed breakdown inside an `EvalResult`.
 *
 * Deliberately a flat object so CI reporters can serialize/diff it without
 * knowledge of the internal scoring algorithm.
 */
export interface EvalBreakdown {
  /** Number of expectations that were found in the output. */
  readonly hits: number;
  /** Total expectations checked. */
  readonly total: number;
  /** Expectations that were absent from the output. */
  readonly misses: readonly string[];
  /** Raw deterministic score (0..1) before judge blending. */
  readonly deterministicScore: number;
  /** Judge score (0..1) if a judge was injected, undefined otherwise. */
  readonly judgeScore?: number;
  /** Free-form notes from the judge, if one was injected. */
  readonly judgeNotes?: string;
}

/**
 * Everything produced for one `EvalCase`.
 *
 * @property id       - Echoes `EvalCase.id` for easy cross-referencing.
 * @property score    - Final blended score in [0, 1].
 * @property passed   - True when `score >= 0.7` (the default pass threshold).
 * @property breakdown - Full per-case diagnostics.
 */
export interface EvalResult {
  readonly id: string;
  readonly score: number;
  readonly passed: boolean;
  readonly breakdown: EvalBreakdown;
}

// ─── Aggregate report ────────────────────────────────────────────────────────

/**
 * Aggregate output of `runEval`.
 *
 * @property meanScore - Arithmetic mean of all per-case `score` values.
 * @property passRate  - Fraction of cases that passed (0..1).
 * @property results   - Full per-case results in case order.
 */
export interface EvalReport {
  readonly meanScore: number;
  readonly passRate: number;
  readonly results: readonly EvalResult[];
}

// ─── Judge interface ─────────────────────────────────────────────────────────

/**
 * An async evaluator that can reason beyond keyword matching.
 *
 * Implementations may call an LLM, a rubric-based classifier, or any other
 * heuristic — the runner treats it as a black box and blends its score with
 * the deterministic result.
 *
 * Receives the same data visible to the deterministic scorer so the judge can
 * decide how much weight to give expectations vs. rubric reasoning.
 *
 * Returns:
 * - `score`  — a value in [0, 1] where 1 is perfect quality.
 * - `notes`  — a human-readable explanation (logged into `EvalBreakdown.judgeNotes`).
 */
export type Judge = (args: {
  readonly input: string;
  readonly output: string;
  readonly expectations: readonly string[];
}) => Promise<{ readonly score: number; readonly notes: string }>;
