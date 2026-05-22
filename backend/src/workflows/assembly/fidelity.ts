/**
 * Fidelity checker — RED-finding coverage verification.
 *
 * Mechanical check: every RED finding's title must appear (or have key terms
 * appear) in the assembled deliverable. The optional `llm` enables a cheap
 * spot-check on findings whose titles are short/generic (≤ 4 words) — but the
 * module is fully functional without it.
 *
 * @module workflows/assembly/fidelity
 */

import type { FidelityResult, LlmComplete, VerifyFidelity } from "../contracts";
import type { Finding } from "../types";

// ---------------------------------------------------------------------------
// Coverage helpers
// ---------------------------------------------------------------------------

/**
 * Normalise a string for comparison: lowercase, collapse whitespace, strip
 * punctuation that would prevent a substring match.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/["""''`]/g, "")          // smart quotes → gone
    .replace(/[–—]/g, " ")             // em/en dash → space
    .replace(/[^\w\s]/g, " ")          // other punctuation → space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Return true if `title` is represented in `doc`.
 *
 * Representation is checked in two passes:
 *   1. Full normalised title substring match.
 *   2. Significant-word coverage: at least 60% of words with ≥ 4 characters
 *      appear in the normalised doc. Handles paraphrasing of longer titles.
 */
function isCovered(title: string, normDoc: string): boolean {
  const normTitle = normalise(title);

  // Pass 1: exact substring
  if (normDoc.includes(normTitle)) return true;

  // Pass 2: significant-word coverage
  const words = normTitle.split(/\s+/).filter((w) => w.length >= 4);
  if (words.length === 0) {
    // Very short title — fall back to any-word presence
    return normTitle.split(/\s+/).some((w) => normDoc.includes(w));
  }
  const covered = words.filter((w) => normDoc.includes(w));
  return covered.length / words.length >= 0.6;
}

// ---------------------------------------------------------------------------
// LLM spot-check (optional)
// ---------------------------------------------------------------------------

/**
 * Ask the LLM whether a specific RED finding is addressed in the deliverable.
 * Only called for findings that failed the mechanical check when `llm` is
 * provided. Returns true if the LLM believes the finding is covered.
 *
 * Kept as a narrow, deterministic-feeling call: answer must be exactly "yes"
 * or "no" (first word after stripping whitespace, lowercased).
 */
async function llmSpotCheck(
  finding: Finding,
  doc: string,
  llm: LlmComplete,
): Promise<boolean> {
  const excerpt = doc.length > 3000 ? doc.slice(0, 3000) + "\n…[truncated]" : doc;
  const answer = await llm({
    model: "claude-haiku-4-5",
    systemPrompt:
      "You are a legal document auditor. Answer ONLY 'yes' or 'no'. No explanation.",
    user: [
      `RED finding title: "${finding.title}"`,
      `RED finding detail: "${finding.detail.slice(0, 400)}"`,
      "",
      "Does the following deliverable explicitly address or discuss this finding?",
      "",
      "DELIVERABLE:",
      excerpt,
    ].join("\n"),
    maxTokens: 4,
  });
  return answer.trim().toLowerCase().startsWith("yes");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Verify that every RED finding is represented in the assembled deliverable.
 *
 * Mechanical (always):
 *   - Identify all RED findings in `run.findings`.
 *   - For each: check whether the normalised title appears in the normalised doc.
 *   - Compute `redTotal`, `redCovered`, `missing[]`, `ok`.
 *
 * Optional LLM spot-check:
 *   - When `llm` is provided, any finding that FAILED the mechanical check is
 *     re-evaluated with a yes/no LLM call. If the LLM says yes, the finding
 *     counts as covered (and is removed from `missing`).
 *
 * @param run  - Completed workflow run.
 * @param doc  - The assembled deliverable text.
 * @param llm  - Optional injected LLM for cheap spot-checks.
 * @returns {@link FidelityResult}.
 */
export const verifyFidelity: VerifyFidelity = async (
  run,
  doc,
  llm?: LlmComplete,
): Promise<FidelityResult> => {
  const redFindings = run.findings.filter((f) => f.severity === "RED");
  const redTotal = redFindings.length;

  if (redTotal === 0) {
    return { ok: true, redTotal: 0, redCovered: 0, missing: [] };
  }

  const normDoc = normalise(doc);
  const missing: string[] = [];
  let redCovered = 0;

  for (const finding of redFindings) {
    const covered = isCovered(finding.title, normDoc);

    if (covered) {
      redCovered++;
    } else if (llm !== undefined) {
      // Optional: give the LLM a chance to confirm coverage
      const llmSays = await llmSpotCheck(finding, doc, llm);
      if (llmSays) {
        redCovered++;
      } else {
        missing.push(finding.title);
      }
    } else {
      missing.push(finding.title);
    }
  }

  return {
    ok: missing.length === 0,
    redTotal,
    redCovered,
    missing,
  };
};
