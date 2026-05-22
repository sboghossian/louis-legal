/**
 * Eval cases — risky clause detection task.
 *
 * Tests that the model flags high-risk clauses in a contract excerpt and provides
 * actionable commentary. Covers the two most common risk patterns seen in MENA
 * commercial contracts handled by Louis users:
 *
 * 1. Uncapped liability — the indemnifying party bears unlimited financial exposure.
 * 2. Unilateral termination with no cure period — the counterparty can exit the
 *    contract for any reason without giving the breaching party a chance to remedy.
 *
 * The expectations are deliberately keyword-centric so the deterministic scorer can
 * verify coverage without an LLM; the rubric provides richer criteria for a judge.
 */

import type { EvalCase } from "../types";

const RISKY_CONTRACT_EXCERPT = `
SERVICE AGREEMENT (EXCERPT)

8. Indemnification. Supplier shall indemnify, defend, and hold harmless Client and its
   affiliates, officers, employees, and agents from and against any and all claims,
   damages, losses, costs, and expenses (including reasonable attorneys' fees) arising
   out of or related to Supplier's performance under this Agreement, with no limitation
   on the total amount of such indemnification.

9. Termination for Convenience. Client may terminate this Agreement at any time, for any
   reason or no reason, upon seven (7) days' written notice to Supplier. Upon termination,
   Client's sole obligation shall be payment for services rendered through the termination
   date. No cure period shall apply.

10. Governing Law & Dispute Resolution. Any dispute shall be resolved by binding arbitration
    administered by the Dubai International Arbitration Centre (DIAC) under its rules.
    The seat of arbitration shall be Dubai. The governing law shall be the laws of the
    United Arab Emirates.
`.trim();

export const riskyClauseCases: readonly EvalCase[] = [
  {
    id: "risky-clause-uncapped-liability",
    input: `Review the following contract excerpt and flag any high-risk clauses. Explain why each is risky and suggest mitigation:\n\n${RISKY_CONTRACT_EXCERPT}`,
    expectations: [
      "uncapped",
      "unlimited",
      "indemnif",
      "termination",
      "cure period",
      "risk",
    ],
    rubric:
      "Must identify: (1) the uncapped indemnification in clause 8 as a high-risk item for the Supplier, noting the absence of any liability cap; (2) the unilateral termination-for-convenience clause with no cure period in clause 9; (3) at least one concrete mitigation per risk (e.g., negotiate a liability cap, request a 30-day cure period). Hallucinated risks not present in the excerpt should result in a lower judge score.",
  },
  {
    id: "risky-clause-arbitration-seat",
    input: `Identify jurisdiction and dispute-resolution risks in the following contract excerpt:\n\n${RISKY_CONTRACT_EXCERPT}`,
    expectations: [
      "dubai",
      "diac",
      "arbitration",
      "united arab emirates",
      "governing law",
    ],
    rubric:
      "Must correctly identify the DIAC arbitration clause, Dubai as the seat, and UAE governing law. Should note any asymmetry in the chosen forum if relevant. Must not confuse UAE law with any other jurisdiction.",
  },
];
