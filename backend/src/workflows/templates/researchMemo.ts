/**
 * Seed template: Research Memo (Wave 2, Slice 2a).
 *
 * Legal-research workflow: frame the question, gather authority, analyse, and
 * draft a memo. Authority-gathering and analysis cite sources and are marked
 * for grounding verification (ADR #3). No side effects, so no gates.
 */

import type { WorkflowTemplate } from "../types";

export const researchMemo: WorkflowTemplate = {
  id: "research-memo",
  title: "Research Memo",
  description:
    "Answer a legal research question: frame the issues, gather statutory/case authority, apply it to the facts, and draft a research memo.",
  steps: [
    {
      id: "frame",
      intent:
        "Restate the legal question, the jurisdiction, and the discrete issues to research.",
      skillHint: "legal-research",
      modelTier: "mid",
    },
    {
      id: "authority",
      intent:
        "Gather relevant statutes, cases, and secondary authority for each issue.",
      skillHint: "legal-research",
      modelTier: "main",
      citesDocuments: true,
    },
    {
      id: "analysis",
      intent:
        "Apply the authority to the facts; emit findings where the law is unsettled or adverse.",
      skillHint: "legal-research",
      modelTier: "main",
      citesDocuments: true,
    },
    {
      id: "memo",
      intent:
        "Draft a research memo: question presented, short answer, analysis, and conclusion.",
      modelTier: "mid",
    },
  ],
};
