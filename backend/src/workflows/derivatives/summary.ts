/**
 * Executive summary derivative.
 *
 * Converts a completed workflow run into a concise executive summary: a
 * structured one-page overview of findings, risk rating, and recommended
 * actions — suitable for a busy partner or in-house counsel to scan in
 * under two minutes.
 */

import type { Derivative } from "../contracts";
import type { Finding } from "../types";

function findingsBySeverity(findings: Finding[], severity: Finding["severity"]): Finding[] {
  return findings.filter(f => f.severity === severity);
}

export const summaryDerivative: Derivative = {
  type: "summary",
  title: "Executive Summary",
  buildContext(run) {
    const red = findingsBySeverity(run.findings, "RED");
    const yellow = findingsBySeverity(run.findings, "YELLOW");
    const green = findingsBySeverity(run.findings, "GREEN");

    const overallRisk =
      red.length > 0 ? "HIGH" : yellow.length > 0 ? "MEDIUM" : "LOW";

    const findingLines = run.findings
      .map(f => `- [${f.severity}] ${f.title}: ${f.detail.slice(0, 200)}${f.detail.length > 200 ? "..." : ""}`)
      .join("\n");

    const deliverableNote = run.deliverable
      ? `\nDeliverable excerpt (first 2000 chars):\n${run.deliverable.slice(0, 2000)}`
      : "";

    const systemPrompt = [
      "You are a legal analyst writing an executive summary of a completed legal workflow review.",
      "Target reader: partner-level counsel or senior in-house legal team member.",
      "Format the summary as follows (use these exact headings):",
      "",
      "## Overview",
      "One paragraph: what was reviewed, overall risk verdict (HIGH / MEDIUM / LOW), and the headline conclusion.",
      "",
      "## Key Findings",
      "Bullet list. RED findings first (label them ⚠ High Risk), then YELLOW (label ⚬ Attention Required), then GREEN (label ✓).",
      "Each bullet: finding title + one-sentence plain-English description of the issue and its significance.",
      "",
      "## Risk Assessment",
      "Two-sentence assessment: exposure level, primary concerns if action is not taken.",
      "",
      "## Recommended Actions",
      "Numbered list of concrete, prioritised next steps (most urgent first). Be specific.",
      "",
      "## Conclusion",
      "One sentence wrapping up.",
      "",
      "Keep the entire summary under 600 words. Do not repeat the same information twice.",
      "Do NOT fabricate findings, parties, or clauses beyond what is provided.",
    ].join("\n");

    const user = [
      `Workflow template: ${run.templateId}`,
      `Overall risk: ${overallRisk}`,
      `Findings: ${red.length} RED, ${yellow.length} YELLOW, ${green.length} GREEN (total: ${run.findings.length})`,
      "",
      "FINDINGS DETAIL:",
      findingLines || "No findings.",
      deliverableNote,
      "",
      "Write the executive summary now.",
    ].join("\n");

    return { systemPrompt, user, maxTokens: 900 };
  },
};
