/**
 * Client-letter derivative.
 *
 * Converts a completed workflow run into a plain-language client communication:
 * a structured letter summarising findings, their implications, and recommended
 * next steps — written for the client, not the lawyer.
 */

import type { Derivative } from "../contracts";
import type { Finding } from "../types";

function formatFindings(findings: Finding[]): string {
  if (findings.length === 0) return "No findings were recorded during this review.";
  return findings
    .map((f, i) => {
      const sev = f.severity === "RED" ? "⚠ High Risk" : f.severity === "YELLOW" ? "⚬ Attention Required" : "✓ Clean";
      return `${i + 1}. [${sev}] ${f.title}\n   ${f.detail}`;
    })
    .join("\n\n");
}

export const clientLetterDerivative: Derivative = {
  type: "client-letter",
  title: "Client Letter",
  buildContext(run) {
    const redCount = run.findings.filter(f => f.severity === "RED").length;
    const yellowCount = run.findings.filter(f => f.severity === "YELLOW").length;
    const deliverableExcerpt = run.deliverable
      ? `\n\nThe detailed analysis produced the following deliverable:\n---\n${run.deliverable.slice(0, 3000)}${run.deliverable.length > 3000 ? "\n[... truncated ...]" : ""}\n---`
      : "";

    const systemPrompt = [
      "You are a senior legal counsel drafting a formal client letter on behalf of the reviewing law firm.",
      "Your audience is the client — a business executive or entrepreneur — not a lawyer.",
      "Write in plain, clear English. Avoid jargon; when a legal term is unavoidable, define it in parentheses.",
      "The letter must:",
      "  1. Open with a polite salutation and one-sentence purpose statement.",
      "  2. Summarise what was reviewed and the overall risk picture in 2–3 sentences.",
      "  3. Walk through each significant finding (RED first, then YELLOW), explaining in plain language:",
      "       - what the issue is,",
      "       - why it matters to the client's business,",
      "       - what we recommend the client do about it.",
      "  4. Close with clear next steps and an invitation to discuss.",
      "  5. End with a professional sign-off.",
      "Keep the tone professional but approachable. Do not pad — be direct.",
      "Do NOT fabricate facts, clauses, or parties not present in the findings.",
    ].join("\n");

    const user = [
      `Workflow: ${run.templateId}`,
      `Findings summary: ${redCount} high-risk, ${yellowCount} attention items, ${run.findings.length - redCount - yellowCount} clean.`,
      "",
      "FINDINGS:",
      formatFindings(run.findings),
      deliverableExcerpt,
      "",
      "Draft the client letter now.",
    ].join("\n");

    return { systemPrompt, user, maxTokens: 1500 };
  },
};
