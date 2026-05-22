/**
 * Legal memo derivative.
 *
 * Converts a completed workflow run into a formal internal legal memorandum:
 * a IRAC-structured (Issue, Rule, Analysis, Conclusion) memo suitable for
 * the matter file, partner review, or client advice file. Written at the
 * lawyer-to-lawyer level, with precise legal language and explicit risk
 * characterisation.
 */

import type { Derivative } from "../contracts";
import type { Finding } from "../types";

function groupFindings(findings: Finding[]): { red: Finding[]; yellow: Finding[]; green: Finding[] } {
  return {
    red: findings.filter(f => f.severity === "RED"),
    yellow: findings.filter(f => f.severity === "YELLOW"),
    green: findings.filter(f => f.severity === "GREEN"),
  };
}

function iracBlock(finding: Finding): string {
  const citations = finding.citations && finding.citations.length > 0
    ? `\n   Sources/references: ${finding.citations.join("; ")}`
    : "";
  return [
    `Finding ID: ${finding.id}  |  Step: ${finding.stepId}  |  Severity: ${finding.severity}`,
    `Issue:    ${finding.title}`,
    `Analysis: ${finding.detail}${citations}`,
  ].join("\n");
}

export const memoDerivative: Derivative = {
  type: "memo",
  title: "Legal Memorandum",
  buildContext(run) {
    const { red, yellow, green } = groupFindings(run.findings);

    const redBlocks = red.map(iracBlock).join("\n\n");
    const yellowBlocks = yellow.map(iracBlock).join("\n\n");
    const greenBlocks = green.map(iracBlock).join("\n\n");

    const deliverableSection = run.deliverable
      ? `\nUNDERLYING DELIVERABLE (excerpt for context, first 2500 chars):\n${run.deliverable.slice(0, 2500)}`
      : "";

    const systemPrompt = [
      "You are a senior associate drafting a formal internal legal memorandum for partner review.",
      "The memo will be placed in the matter file and may be shared with the client as legal advice.",
      "",
      "Use the following structure and headings (in order):",
      "",
      "MEMORANDUM",
      "TO: [Partner / Matter File]",
      "FROM: Legal Review System",
      `RE: Workflow Analysis — ${run.templateId}`,
      "DATE: [today's date]",
      "CONFIDENTIAL — ATTORNEY-CLIENT PRIVILEGE",
      "",
      "1. EXECUTIVE SUMMARY",
      "   Two paragraphs: what was reviewed, overall risk classification, and the headline conclusions.",
      "",
      "2. ISSUES IDENTIFIED",
      "   For each RED finding: full IRAC analysis.",
      "     Issue: state the legal issue precisely.",
      "     Rule: cite the applicable rule, statute, or contractual principle.",
      "     Analysis: apply the rule to the facts. Be specific.",
      "     Conclusion: state the risk and recommended resolution.",
      "   Then cover YELLOW findings at a lighter level of analysis.",
      "   Then confirm GREEN items as satisfactory.",
      "",
      "3. RISK MATRIX",
      "   Table or structured list: Finding | Severity | Likelihood | Recommended Action | Urgency.",
      "",
      "4. RECOMMENDED ACTIONS",
      "   Numbered list, priority order. For each: specific action, responsible party, target timeline.",
      "",
      "5. CONCLUSION",
      "   One paragraph: overall assessment and any conditions on the advice.",
      "",
      "Tone: precise, formal legal English. Cite clause references where available.",
      "Do NOT fabricate legal rules, citations, or parties not grounded in the findings.",
      "Do NOT soften or omit RED findings — they must be fully analysed.",
    ].join("\n");

    const user = [
      `Workflow: ${run.templateId}`,
      `Run ID: ${run.id}`,
      `Findings: ${red.length} RED (high risk), ${yellow.length} YELLOW (attention required), ${green.length} GREEN (clean)`,
      "",
      red.length > 0 ? `HIGH RISK FINDINGS (${red.length}):\n${redBlocks}` : "No high-risk findings.",
      "",
      yellow.length > 0 ? `ATTENTION REQUIRED (${yellow.length}):\n${yellowBlocks}` : "No attention-required findings.",
      "",
      green.length > 0 ? `CLEAN ITEMS (${green.length}):\n${greenBlocks}` : "",
      deliverableSection,
      "",
      "Draft the legal memorandum now.",
    ].filter(s => s !== "").join("\n");

    return { systemPrompt, user, maxTokens: 2500 };
  },
};
