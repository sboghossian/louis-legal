/**
 * Template registry tests (Wave 2, Slice 2a): lookup, listing, and the pure
 * structural validator — including the side-effect ⇒ gate invariant
 * (ADR #5 / /lecun-world-model). The three seed templates must all validate.
 */
import { describe, it, expect } from "vitest";

import {
  getTemplate,
  listTemplates,
  validateTemplate,
  isValidTemplate,
  TEMPLATES,
} from "./registry";
import type { WorkflowTemplate } from "../types";

describe("registry lookup", () => {
  it("ships exactly the three seed templates", () => {
    expect(listTemplates().map((t) => t.id).sort()).toEqual([
      "contract-review",
      "due-diligence",
      "research-memo",
    ]);
  });

  it("getTemplate returns a template by id, undefined otherwise", () => {
    expect(getTemplate("contract-review")?.title).toBe("Contract Review");
    expect(getTemplate("nope")).toBeUndefined();
  });

  it("listTemplates returns a fresh array (mutating it cannot corrupt the registry)", () => {
    const a = listTemplates();
    a.pop();
    expect(listTemplates()).toHaveLength(TEMPLATES.length);
  });
});

describe("seed template validity", () => {
  it("every seed template is structurally valid", () => {
    for (const t of listTemplates()) {
      expect(validateTemplate(t)).toEqual([]);
    }
  });

  it("seed steps have unique ids and read-only seeds carry no gates", () => {
    for (const t of listTemplates()) {
      const ids = t.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      // The seed set is analytical/read-only: no side effects, hence no gates.
      expect(t.steps.some((s) => s.sideEffect || s.gate)).toBe(false);
    }
  });
});

describe("validateTemplate", () => {
  const base: WorkflowTemplate = {
    id: "t",
    title: "T",
    description: "d",
    steps: [{ id: "s1", intent: "do a thing", modelTier: "mid" }],
  };

  it("flags empty id / title / description / steps", () => {
    expect(validateTemplate({ ...base, id: "  " })).toContain("template id is empty");
    expect(validateTemplate({ ...base, title: "" })).toContain("template title is empty");
    expect(validateTemplate({ ...base, description: "" })).toContain(
      "template description is empty",
    );
    expect(validateTemplate({ ...base, steps: [] })).toContain("template has no steps");
  });

  it("flags duplicate step ids", () => {
    const t: WorkflowTemplate = {
      ...base,
      steps: [
        { id: "dup", intent: "a", modelTier: "mid" },
        { id: "dup", intent: "b", modelTier: "mid" },
      ],
    };
    expect(validateTemplate(t)).toContain('duplicate step id "dup"');
  });

  it("flags an empty step intent and an invalid model tier", () => {
    const t: WorkflowTemplate = {
      ...base,
      steps: [{ id: "s1", intent: "  ", modelTier: "turbo" as never }],
    };
    const problems = validateTemplate(t);
    expect(problems).toContain('step "s1" has an empty intent');
    expect(problems).toContain('step "s1" has an invalid modelTier "turbo"');
  });

  it("enforces side-effect ⇒ gate (the /lecun-world-model invariant)", () => {
    const ungated: WorkflowTemplate = {
      ...base,
      steps: [{ id: "send", intent: "email the client", modelTier: "mid", sideEffect: true }],
    };
    expect(validateTemplate(ungated)).toContain('step "send" has a side effect but is not gated');

    const gated: WorkflowTemplate = {
      ...base,
      steps: [
        { id: "send", intent: "email the client", modelTier: "mid", sideEffect: true, gate: true },
      ],
    };
    expect(isValidTemplate(gated)).toBe(true);
  });
});
