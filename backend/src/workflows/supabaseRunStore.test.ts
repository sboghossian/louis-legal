/**
 * Pure mapper tests for the Supabase workflow run store (Wave 2, Slice 2a).
 * No DB: covers the row↔run mapping only. Live I/O runs against the real table,
 * not in unit tests (no DB in CI).
 */
import { describe, it, expect } from "vitest";

import { rowToRun, runToRow, type WorkflowRunRow } from "./supabaseRunStore";
import type { WorkflowRun } from "./types";

const T0 = "2026-05-22T00:00:00.000Z";

describe("rowToRun / runToRow", () => {
  it("round-trips a fully-populated run", () => {
    const run: WorkflowRun = {
      id: "r1",
      userId: "u1",
      templateId: "contract-review",
      status: "gated",
      currentStepIndex: 3,
      findings: [
        {
          id: "f1",
          stepId: "risk-flags",
          severity: "RED",
          title: "Unilateral termination",
          detail: "Clause 12.3",
          citations: ["doc-1#cl-12.3"],
        },
      ],
      input: { matterId: "m-7" },
      deliverable: "## Summary\n…",
      error: "previously recovered",
      createdAt: T0,
      updatedAt: T0,
    };
    expect(rowToRun(runToRow(run))).toEqual(run);
  });

  it("maps absent input/deliverable/error to null columns and back to absent", () => {
    const run: WorkflowRun = {
      id: "r2",
      userId: "u1",
      templateId: "research-memo",
      status: "queued",
      currentStepIndex: 0,
      findings: [],
      createdAt: T0,
      updatedAt: T0,
    };
    const row = runToRow(run);
    expect(row.input).toBeNull();
    expect(row.deliverable).toBeNull();
    expect(row.error).toBeNull();

    const back = rowToRun(row);
    expect(back).toEqual(run);
    expect(back.input).toBeUndefined();
    expect(back.deliverable).toBeUndefined();
    expect(back.error).toBeUndefined();
  });

  it("tolerates a null/absent findings column as an empty array", () => {
    const row: WorkflowRunRow = {
      id: "r3",
      user_id: "u",
      template_id: "due-diligence",
      status: "running",
      current_step_index: 1,
      // Simulate a row where the JSONB default was somehow absent.
      findings: null as unknown as WorkflowRunRow["findings"],
      input: null,
      deliverable: null,
      error: null,
      created_at: T0,
      updated_at: T0,
    };
    expect(rowToRun(row).findings).toEqual([]);
  });
});
