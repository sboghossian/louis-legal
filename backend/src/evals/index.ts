/**
 * Public barrel for the Louis eval harness.
 *
 * Re-exports every public symbol so consumers can import from one path:
 *
 * ```ts
 * import { runEval, allSeedCases, scoreDeterministic } from "./evals";
 * import type { EvalCase, EvalReport, Judge } from "./evals";
 * ```
 */

export type { EvalCase, EvalResult, EvalReport, EvalBreakdown, Judge } from "./types";
export { scoreDeterministic, hasPlaceholder } from "./scorer";
export { runEval, PASS_THRESHOLD } from "./runner";
export type { RunEvalOptions } from "./runner";
export { allSeedCases, ndaSummaryCases, riskyClauseCases } from "./cases/index";
