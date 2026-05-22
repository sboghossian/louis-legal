/**
 * Workflow template registry (Wave 2, Slice 2a).
 *
 * The seed templates are code-defined (v1 — user authoring deferred). The
 * registry exposes lookup by id and a list, plus {@link validateTemplate}, a
 * pure structural check used both as a test guard for the seeds and (in 2b) as a
 * gate before a template is run.
 */

import type { ModelTier } from "../../lib/llm/effort";
import type { WorkflowTemplate } from "../types";

import { contractReview } from "./contractReview";
import { dueDiligence } from "./dueDiligence";
import { researchMemo } from "./researchMemo";

/** All seed templates, in display order. */
export const TEMPLATES: readonly WorkflowTemplate[] = [
  contractReview,
  dueDiligence,
  researchMemo,
];

const BY_ID = new Map<string, WorkflowTemplate>(TEMPLATES.map((t) => [t.id, t]));

const VALID_TIERS: readonly ModelTier[] = ["low", "mid", "main"];

/** Look up a template by id. Returns undefined if unknown. */
export function getTemplate(id: string): WorkflowTemplate | undefined {
  return BY_ID.get(id);
}

/** List all templates (a fresh array; callers may sort/filter freely). */
export function listTemplates(): WorkflowTemplate[] {
  return [...TEMPLATES];
}

/**
 * Pure structural validation. Returns a list of human-readable problems; an
 * empty array means the template is valid. Enforces the load-bearing
 * invariants the orchestrator relies on:
 *   - non-empty id / title / description / steps
 *   - unique, non-empty step ids
 *   - every step has a valid {@link ModelTier}
 *   - any side-effect step is also gated (ADR #5 / /lecun-world-model)
 */
export function validateTemplate(t: WorkflowTemplate): string[] {
  const problems: string[] = [];
  if (!t.id.trim()) problems.push("template id is empty");
  if (!t.title.trim()) problems.push("template title is empty");
  if (!t.description.trim()) problems.push("template description is empty");
  if (t.steps.length === 0) problems.push("template has no steps");

  const seen = new Set<string>();
  for (const [i, step] of t.steps.entries()) {
    const where = step.id ? `step "${step.id}"` : `step #${i}`;
    if (!step.id.trim()) {
      problems.push(`${where} has an empty id`);
    } else if (seen.has(step.id)) {
      problems.push(`duplicate step id "${step.id}"`);
    } else {
      seen.add(step.id);
    }
    if (!step.intent.trim()) problems.push(`${where} has an empty intent`);
    if (!VALID_TIERS.includes(step.modelTier)) {
      problems.push(`${where} has an invalid modelTier "${step.modelTier}"`);
    }
    if (step.sideEffect && !step.gate) {
      problems.push(`${where} has a side effect but is not gated`);
    }
  }
  return problems;
}

/** Convenience: true when {@link validateTemplate} finds no problems. */
export function isValidTemplate(t: WorkflowTemplate): boolean {
  return validateTemplate(t).length === 0;
}
