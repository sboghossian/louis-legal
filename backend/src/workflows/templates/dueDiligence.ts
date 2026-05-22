/**
 * Seed template: Due Diligence (Wave 2, Slice 2a).
 *
 * Read-only pass over a document set: inventory, issue spotting, red-flag
 * escalation, and a grouped DD report. No side effects, so no gates.
 */

import type { WorkflowTemplate } from "../types";

export const dueDiligence: WorkflowTemplate = {
  id: "due-diligence",
  title: "Due Diligence",
  description:
    "Run a due-diligence pass over a document set: inventory what is present vs. missing, spot legal/financial/structural issues, escalate the material red flags, and assemble a DD report.",
  steps: [
    {
      id: "inventory",
      intent:
        "Inventory the provided documents and note what is present vs. missing against a standard DD checklist.",
      skillHint: "due-diligence",
      modelTier: "mid",
    },
    {
      id: "issue-spotting",
      intent:
        "Spot legal, financial, and structural issues across the document set; emit findings with severity.",
      skillHint: "due-diligence",
      modelTier: "main",
      citesDocuments: true,
    },
    {
      id: "red-flags",
      intent:
        "Escalate the most material RED issues and explain their deal impact.",
      skillHint: "risk-assessment",
      modelTier: "main",
      citesDocuments: true,
    },
    {
      id: "dd-report",
      intent:
        "Assemble a due-diligence report grouping findings by area and severity.",
      modelTier: "mid",
    },
  ],
};
