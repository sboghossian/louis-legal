/**
 * Redline instruction set derivative.
 *
 * Converts a completed workflow run into a structured set of redline
 * instructions: an ordered, clause-by-clause list telling the drafter exactly
 * what to change, add, or delete in the document — keyed to each RED/YELLOW
 * finding. Output is a professional mark-up instruction memo suitable for
 * handing to a junior associate or counter-party.
 */

import type { Derivative } from "../contracts";
import type { Finding } from "../types";

function formatFindingForRedline(f: Finding, index: number): string {
  const priority = f.severity === "RED" ? "PRIORITY: MUST FIX" : "PRIORITY: RECOMMENDED";
  const citations = f.citations && f.citations.length > 0
    ? `  Clause/Reference: ${f.citations.join(", ")}`
    : "";
  return [
    `${index}. ${f.title}`,
    `   ${priority}`,
    citations,
    `   Issue: ${f.detail}`,
  ].filter(Boolean).join("\n");
}

export const redlineDerivative: Derivative = {
  type: "redline",
  title: "Redline Instruction Set",
  buildContext(run) {
    const actionableFindings = run.findings.filter(f => f.severity !== "GREEN");
    const redFindings = run.findings.filter(f => f.severity === "RED");
    const yellowFindings = run.findings.filter(f => f.severity === "YELLOW");

    const findingInstructions = actionableFindings
      .map((f, i) => formatFindingForRedline(f, i + 1))
      .join("\n\n");

    const deliverableContext = run.deliverable
      ? `\nThe workflow produced this deliverable (used for context):\n---\n${run.deliverable.slice(0, 2500)}\n---`
      : "";

    const systemPrompt = [
      "You are a senior transactional lawyer producing a redline instruction memorandum.",
      "Your output is a precise, clause-level instruction set for amending a legal document.",
      "For each finding, produce one or more numbered redline instructions in this format:",
      "",
      "  Instruction N — [Clause / Section reference if known]",
      "  Action: [DELETE | REPLACE | ADD | AMEND]",
      "  Current text (if applicable): \"...quoted text...\"",
      "  Revised / replacement text: \"...exact proposed language...\"",
      "  Rationale: one sentence explaining why this change is necessary.",
      "",
      "Rules:",
      "  - RED findings MUST produce at minimum one concrete instruction marked MUST FIX.",
      "  - YELLOW findings produce RECOMMENDED instructions.",
      "  - If the finding is too abstract to produce specific replacement language, produce a",
      "    FLAGGED instruction explaining what must be resolved before finalization.",
      "  - Use standard redline conventions (track-changes language: 'delete X / insert Y').",
      "  - Number instructions sequentially across all findings.",
      "  - Do not explain the findings again — produce only the instructions.",
      "  - Do NOT fabricate clause numbers or text that isn't grounded in the findings.",
    ].join("\n");

    const user = [
      `Workflow: ${run.templateId}`,
      `Actionable findings: ${redFindings.length} MUST FIX, ${yellowFindings.length} RECOMMENDED`,
      "",
      "FINDINGS REQUIRING REDLINE INSTRUCTIONS:",
      findingInstructions || "No actionable findings. No redline instructions required.",
      deliverableContext,
      "",
      "Produce the redline instruction set now.",
    ].join("\n");

    return { systemPrompt, user, maxTokens: 2000 };
  },
};
