/**
 * Seed template: Contract Review (Wave 2, Slice 2a).
 *
 * Read-only analytical pass over a single uploaded contract. No side effects,
 * so no gates. Risk-flagging and compliance steps cite the document and are
 * marked for grounding verification (ADR #3).
 */

import type { WorkflowTemplate } from "../types";

export const contractReview: WorkflowTemplate = {
  id: "contract-review",
  title: "Contract Review",
  description:
    "Review an uploaded contract: extract parties and defined terms, surface key commercial terms, flag risky clauses, and assemble a structured summary.",
  steps: [
    {
      id: "extract-parties",
      intent:
        "Extract every party, their role, and all defined terms from the contract.",
      skillHint: "contract-review",
      modelTier: "mid",
    },
    {
      id: "key-terms",
      intent:
        "Identify the key commercial terms: obligations, payment terms, durations, and deadlines.",
      skillHint: "contract-review",
      modelTier: "mid",
    },
    {
      id: "risk-flags",
      intent:
        "Flag unusual, onerous, or non-market clauses; emit one finding per issue with a severity.",
      skillHint: "risk-assessment",
      modelTier: "main",
      citesDocuments: true,
    },
    {
      id: "compliance-check",
      intent:
        "Check governing-law and regulatory compliance gaps relevant to the contract type.",
      skillHint: "compliance",
      modelTier: "mid",
      citesDocuments: true,
    },
    {
      id: "summary",
      intent:
        "Assemble a structured review summary covering parties, key terms, and flagged risks.",
      modelTier: "mid",
    },
  ],
};
