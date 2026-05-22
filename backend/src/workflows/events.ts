/**
 * Wave 4 — workflow progress SSE events.
 *
 * Provides typed helpers for streaming workflow run progress over the chat
 * channel's Server-Sent-Events stream. The SSE convention matches what
 * `routes/chat.ts` uses for its `grounding` / `budget` / `routing` trailing
 * events:
 *
 *   data: <compact JSON>\n\n
 *
 * No named `event:` line — just the `data:` line terminated by a blank line.
 *
 * Wiring note: the lead calls
 *   write(toSSE(progressFromRun(run)))
 * from the `/chat` opt-in workflow-dispatch path (e.g. before the LLM stream
 * starts, after each step completes, and on terminal transitions). No changes
 * to this file are needed; it is a pure utility layer.
 */

import type { WorkflowRun, RunStatus } from "./types";

// ---------------------------------------------------------------------------
// Event shape
// ---------------------------------------------------------------------------

/**
 * A single workflow-progress event emitted on the chat SSE channel.
 *
 * Consumers that do not recognise `type: "workflow_progress"` will safely
 * ignore it — the existing client-side SSE handling in the frontend skips
 * unknown event types.
 */
export interface WorkflowProgressEvent {
  type: "workflow_progress";
  /** Id of the {@link WorkflowRun} this event describes. */
  runId: string;
  /** Current lifecycle status of the run. */
  status: RunStatus;
  /**
   * Zero-based index of the step that is currently active (running, gated,
   * or just completed). Absent when the run has not yet reached a step (e.g.
   * still `queued` at index 0 with no steps executed).
   */
  stepIndex?: number;
  /**
   * Id of the step that is currently active. Passed through from `opts.stepId`
   * when provided; not derived from the template (the events module is
   * template-agnostic — it only knows the run).
   */
  stepId?: string;
  /** Human-readable status note (e.g. "Waiting for approval" for gated runs). */
  message?: string;
  /**
   * Number of findings accumulated in the run at the time this event was
   * emitted. Omitted when the run has no findings yet (avoids noisy zero
   * values during early steps).
   */
  findingCount?: number;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/** Optional overrides for {@link progressFromRun}. */
export interface ProgressFromRunOpts {
  /** Step id of the currently active step (not available on the run itself). */
  stepId?: string;
  /** Free-form status annotation for the client to display. */
  message?: string;
}

/**
 * Build a {@link WorkflowProgressEvent} from a run's current state.
 *
 * Pure function — reads `run.id`, `run.status`, `run.currentStepIndex`, and
 * `run.findings.length` plus the optional `opts` overrides. The returned
 * object is serialisable (no prototype methods, no undefined-valued fields).
 *
 * @param run  - The workflow run to snapshot.
 * @param opts - Optional step-id and message overrides.
 */
export function progressFromRun(
  run: WorkflowRun,
  opts?: ProgressFromRunOpts,
): WorkflowProgressEvent {
  const event: WorkflowProgressEvent = {
    type: "workflow_progress",
    runId: run.id,
    status: run.status,
  };

  // Only emit stepIndex when the run has advanced to at least step 0.
  // currentStepIndex is always a number on a WorkflowRun, so we always
  // include it — the caller controls when to call this function.
  event.stepIndex = run.currentStepIndex;

  if (opts?.stepId !== undefined) {
    event.stepId = opts.stepId;
  }

  if (opts?.message !== undefined) {
    event.message = opts.message;
  }

  // Only emit findingCount when there are findings to report.
  if (run.findings.length > 0) {
    event.findingCount = run.findings.length;
  }

  return event;
}

// ---------------------------------------------------------------------------
// SSE formatter
// ---------------------------------------------------------------------------

/**
 * Serialise a {@link WorkflowProgressEvent} as an SSE frame.
 *
 * Convention matched from `routes/chat.ts` (grounding / budget / routing
 * trailing events):
 *
 * ```
 * data: <compact JSON>\n\n
 * ```
 *
 * No named `event:` line. The blank-line terminator (`\n\n`) is included so
 * callers can pass the result straight to `res.write()` without further
 * formatting.
 *
 * Round-trip: `JSON.parse(frame.slice("data: ".length).trimEnd())` returns
 * a value deep-equal to the original event.
 *
 * @param event - The progress event to serialise.
 */
export function toSSE(event: WorkflowProgressEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
