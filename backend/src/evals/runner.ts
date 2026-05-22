/**
 * Eval runner — orchestrates cases, calls the system under test, scores outputs,
 * optionally blends an injected judge, and aggregates into an `EvalReport`.
 *
 * Design constraints:
 * - No network calls unless a `judge` is provided in `opts`.
 * - No global state: every run is a pure async function call.
 * - Judge blending is a simple equal-weight average when both scores are present.
 *   Callers that need a different blend weight should wrap the judge before
 *   passing it in rather than adding a parameter here.
 *
 * Pass threshold:
 * - A case passes when its final blended score is >= `PASS_THRESHOLD`.
 * - The threshold is exported so tests can assert on it without magic numbers.
 */

import { scoreDeterministic } from "./scorer";
import type { EvalCase, EvalReport, EvalResult, Judge } from "./types";

/** Cases with a blended or deterministic score below this value are marked failing. */
export const PASS_THRESHOLD = 0.7;

/**
 * Options accepted by `runEval`.
 *
 * @property judge - Optional LLM or rubric judge injected by the caller.
 *                   When present its score is averaged with the deterministic
 *                   score.  When absent the deterministic score is used directly.
 */
export interface RunEvalOptions {
  readonly judge?: Judge;
}

/**
 * Run a suite of eval cases and return an aggregate report.
 *
 * Cases are executed sequentially so a failing case does not abort the run and
 * the report always covers the full suite. Parallelising is left to the caller
 * (use `Promise.all` on per-case batches) to avoid constraining rate-limited
 * judge implementations.
 *
 * @param cases   - The eval suite to run.
 * @param produce - Async function that calls the system under test and returns
 *                  its raw text output given the case's `input`.
 * @param opts    - Optional runner configuration (judge injection).
 * @returns A fully-populated `EvalReport` over all cases.
 *
 * @example
 * ```ts
 * const report = await runEval(
 *   ndaCases,
 *   async (input) => myLegalAI.summarise(input),
 *   { judge: myLlmJudge },
 * );
 * console.log(report.passRate, report.meanScore);
 * ```
 */
export async function runEval(
  cases: readonly EvalCase[],
  produce: (input: string) => Promise<string>,
  opts: RunEvalOptions = {},
): Promise<EvalReport> {
  const results: EvalResult[] = [];

  for (const evalCase of cases) {
    const output = await produce(evalCase.input);

    const deterministicResult = scoreDeterministic(output, evalCase.expectations);

    let judgeScore: number | undefined;
    let judgeNotes: string | undefined;

    if (opts.judge !== undefined) {
      const judgeResult = await opts.judge({
        input: evalCase.input,
        output,
        expectations: evalCase.expectations,
      });
      judgeScore = judgeResult.score;
      judgeNotes = judgeResult.notes;
    }

    // Blend: equal-weight average when judge is present, deterministic alone otherwise.
    const finalScore =
      judgeScore !== undefined
        ? (deterministicResult.score + judgeScore) / 2
        : deterministicResult.score;

    const result: EvalResult = {
      id: evalCase.id,
      score: finalScore,
      passed: finalScore >= PASS_THRESHOLD,
      breakdown: {
        hits: deterministicResult.hits,
        total: evalCase.expectations.length,
        misses: deterministicResult.misses,
        deterministicScore: deterministicResult.score,
        judgeScore,
        judgeNotes,
      },
    };

    results.push(result);
  }

  const meanScore =
    results.length === 0
      ? 0
      : results.reduce((sum, r) => sum + r.score, 0) / results.length;

  const passRate =
    results.length === 0
      ? 0
      : results.filter((r) => r.passed).length / results.length;

  return { meanScore, passRate, results };
}
