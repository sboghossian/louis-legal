/**
 * Unit tests for backend/src/workflows/events.ts (Wave 4).
 *
 * All tests are pure / deterministic — no network, no LLM, no DB.
 */

import { describe, it, expect } from "vitest";
import { progressFromRun, toSSE } from "./events";
import type { WorkflowRun, Finding } from "./types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_FINDING: Finding = {
  id: "f-1",
  stepId: "step-extract",
  severity: "RED",
  title: "Unilateral termination right",
  detail: "Clause 12.3 grants the counterparty a unilateral exit.",
};

function makeRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: "run-abc",
    userId: "user-1",
    templateId: "contract-review",
    status: "queued",
    currentStepIndex: 0,
    findings: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// progressFromRun
// ---------------------------------------------------------------------------

describe("progressFromRun", () => {
  it("maps a queued run correctly — no findings, no opts", () => {
    const run = makeRun({ status: "queued", currentStepIndex: 0, findings: [] });
    const event = progressFromRun(run);

    expect(event.type).toBe("workflow_progress");
    expect(event.runId).toBe("run-abc");
    expect(event.status).toBe("queued");
    expect(event.stepIndex).toBe(0);
    // No findings → findingCount omitted
    expect(event.findingCount).toBeUndefined();
    // No opts → stepId and message omitted
    expect(event.stepId).toBeUndefined();
    expect(event.message).toBeUndefined();
  });

  it("maps a gated run correctly — includes stepIndex and message from opts", () => {
    const run = makeRun({
      status: "gated",
      currentStepIndex: 2,
      findings: [BASE_FINDING],
    });
    const event = progressFromRun(run, {
      stepId: "step-sign",
      message: "Waiting for human approval",
    });

    expect(event.status).toBe("gated");
    expect(event.stepIndex).toBe(2);
    expect(event.stepId).toBe("step-sign");
    expect(event.message).toBe("Waiting for human approval");
    expect(event.findingCount).toBe(1);
  });

  it("maps a done run correctly — multiple findings, no opts", () => {
    const findings: Finding[] = [
      BASE_FINDING,
      {
        id: "f-2",
        stepId: "step-summary",
        severity: "GREEN",
        title: "Parties identified",
        detail: "Both parties are clearly named.",
      },
      {
        id: "f-3",
        stepId: "step-risks",
        severity: "YELLOW",
        title: "Indemnity cap missing",
        detail: "No indemnity cap was found.",
      },
    ];
    const run = makeRun({
      status: "done",
      currentStepIndex: 4,
      findings,
      deliverable: "Contract reviewed. 3 findings.",
    });
    const event = progressFromRun(run);

    expect(event.status).toBe("done");
    expect(event.stepIndex).toBe(4);
    expect(event.findingCount).toBe(3);
    expect(event.stepId).toBeUndefined();
    expect(event.message).toBeUndefined();
  });

  it("omits findingCount when findings array is empty", () => {
    const run = makeRun({ status: "running", currentStepIndex: 1, findings: [] });
    const event = progressFromRun(run);
    expect(event.findingCount).toBeUndefined();
  });

  it("opts.stepId alone does not set message", () => {
    const run = makeRun({ status: "running", currentStepIndex: 1, findings: [] });
    const event = progressFromRun(run, { stepId: "step-extract" });
    expect(event.stepId).toBe("step-extract");
    expect(event.message).toBeUndefined();
  });

  it("opts.message alone does not set stepId", () => {
    const run = makeRun({ status: "assembling", currentStepIndex: 3, findings: [] });
    const event = progressFromRun(run, { message: "Assembling deliverable…" });
    expect(event.message).toBe("Assembling deliverable…");
    expect(event.stepId).toBeUndefined();
  });

  it("failed run preserves status and stepIndex at failure point", () => {
    const run = makeRun({
      status: "failed",
      currentStepIndex: 1,
      error: "LLM timeout",
      findings: [BASE_FINDING],
    });
    const event = progressFromRun(run, { message: "Step timed out" });

    expect(event.status).toBe("failed");
    expect(event.stepIndex).toBe(1);
    expect(event.findingCount).toBe(1);
    expect(event.message).toBe("Step timed out");
  });
});

// ---------------------------------------------------------------------------
// toSSE
// ---------------------------------------------------------------------------

describe("toSSE", () => {
  it("produces a frame that round-trips correctly", () => {
    const run = makeRun({ status: "running", currentStepIndex: 1, findings: [] });
    const event = progressFromRun(run, {
      stepId: "step-extract",
      message: "Extracting parties",
    });
    const frame = toSSE(event);

    // Must start with the SSE data prefix.
    expect(frame.startsWith("data: ")).toBe(true);

    // Must end with the blank-line terminator.
    expect(frame.endsWith("\n\n")).toBe(true);

    // Extract and parse the JSON payload.
    const jsonPart = frame.slice("data: ".length).trimEnd();
    const parsed = JSON.parse(jsonPart) as typeof event;

    // Deep equality — round-trip lossless.
    expect(parsed).toEqual(event);
  });

  it("includes blank-line terminator (\\n\\n) for SSE framing", () => {
    const run = makeRun({ status: "queued", currentStepIndex: 0, findings: [] });
    const frame = toSSE(progressFromRun(run));
    // The frame is a single data line + blank line (no extra content).
    const lines = frame.split("\n");
    // ["data: {...}", "", ""]  — last element is the trailing empty from split
    expect(lines[0]).toMatch(/^data: \{/);
    expect(lines[1]).toBe("");
  });

  it("serialises a done run with multiple findings and round-trips", () => {
    const findings: Finding[] = [BASE_FINDING, { ...BASE_FINDING, id: "f-2", severity: "GREEN", title: "OK" }];
    const run = makeRun({ status: "done", currentStepIndex: 3, findings });
    const event = progressFromRun(run);
    const frame = toSSE(event);

    const parsed = JSON.parse(frame.slice("data: ".length).trimEnd()) as typeof event;
    expect(parsed.findingCount).toBe(2);
    expect(parsed.status).toBe("done");
    expect(parsed).toEqual(event);
  });

  it("frame has no named event: line — matches chat.ts plain-data convention", () => {
    const run = makeRun({ status: "queued", currentStepIndex: 0, findings: [] });
    const frame = toSSE(progressFromRun(run));
    // Must NOT contain an "event:" line (chat.ts uses data-only frames).
    expect(frame).not.toMatch(/^event:/m);
  });
});
