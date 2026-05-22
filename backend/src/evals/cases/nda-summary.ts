/**
 * Eval cases — NDA summary task.
 *
 * Tests that the model correctly identifies and surfaces the key provisions of a
 * mutual non-disclosure agreement: the confidentiality obligation, the carve-outs
 * (publicly available info, prior knowledge, independent development), the term,
 * and the governing law.
 *
 * These cases use a short representative NDA excerpt so the test suite runs
 * without network access. In a live eval the `input` would be a full document
 * fetched from storage.
 */

import type { EvalCase } from "../types";

const NDA_EXCERPT = `
MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of January 1, 2026
between Acme Corp ("Party A") and Beta Ltd ("Party B").

1. Confidential Information. Each party may disclose confidential information to the other.
   "Confidential Information" means all non-public information designated as confidential or
   reasonably understood to be confidential given its nature.

2. Obligations. Each party agrees to: (a) hold the other party's Confidential Information
   in strict confidence; (b) not disclose it to third parties without prior written consent;
   (c) use it solely for evaluating a potential business relationship.

3. Exclusions. Obligations do not apply to information that: (a) is or becomes publicly
   available without breach; (b) was already known to the receiving party; (c) is
   independently developed; (d) is required to be disclosed by law or court order.

4. Term. This Agreement remains in effect for three (3) years from the date of signing.

5. Governing Law. This Agreement shall be governed by the laws of the State of New York.
`.trim();

export const ndaSummaryCases: readonly EvalCase[] = [
  {
    id: "nda-summary-core-terms",
    input: `Summarise the following NDA, identifying the key obligations, exclusions, term, and governing law:\n\n${NDA_EXCERPT}`,
    expectations: [
      "confidential",
      "3 years",
      "new york",
      "exclusion",
      "publicly available",
    ],
    rubric:
      "The summary must cover: (1) what counts as Confidential Information, (2) the receiving party's core obligations, (3) at least two carve-outs from the confidentiality obligation, (4) the three-year term, and (5) New York governing law. It must not invent terms not present in the excerpt.",
  },
  {
    id: "nda-summary-obligations-focus",
    input: `Extract and explain only the confidentiality obligations from the following NDA:\n\n${NDA_EXCERPT}`,
    expectations: [
      "strict confidence",
      "third parties",
      "written consent",
      "business relationship",
    ],
    rubric:
      "Must enumerate all three sub-obligations from clause 2 accurately, using language close to the source text. Should not hallucinate additional obligations.",
  },
];
