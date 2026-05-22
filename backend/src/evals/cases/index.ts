/**
 * Barrel for seed eval-case fixtures.
 *
 * Import `allSeedCases` for a combined suite, or import individual arrays to
 * run targeted task-level eval subsets.
 */

import type { EvalCase } from "../types";
import { ndaSummaryCases } from "./nda-summary";
import { riskyClauseCases } from "./risky-clause";

export { ndaSummaryCases } from "./nda-summary";
export { riskyClauseCases } from "./risky-clause";

/**
 * All seed cases combined into a single flat array for full-suite runs.
 * The order is stable: NDA cases first, risky-clause cases second.
 */
export const allSeedCases: readonly EvalCase[] = [
  ...ndaSummaryCases,
  ...riskyClauseCases,
];
