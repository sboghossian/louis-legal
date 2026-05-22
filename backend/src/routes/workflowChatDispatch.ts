/**
 * Opt-in workflow dispatch from `/chat` (Wave 4, ADR #1 — one engine, two
 * triggers). ADDITIVE: this only runs when the chat body carries a
 * `workflowTemplateId`; otherwise normal chat is untouched.
 *
 * It enqueues the `workflows.run` BullMQ job and emits an initial
 * `workflow_progress` SSE event with the runId; the client then polls
 * `GET /api/workflows/:runId` for status. Live per-step progress streaming
 * needs shared state across the API and worker processes (Supabase run store)
 * or a pub/sub channel — a documented follow-up; this MVP is correct and
 * process-safe.
 */
import type { Response } from "express";

import { queues } from "../queue";
import { JOB_NAME as WORKFLOWS_RUN } from "../queue/jobs/workflows.run";
import { progressFromRun, toSSE } from "../workflows/events";
import { runStore } from "../workflows/factory";
import { getTemplate, validateTemplate } from "../workflows/templates/registry";

/**
 * Detect an opt-in workflow dispatch on a `/chat` body. Returns null for a
 * normal chat turn (the common case — existing clients never send this field).
 */
export function parseWorkflowDispatch(
  body: Record<string, unknown>,
): { templateId: string; input?: Record<string, unknown> } | null {
  const t = body.workflowTemplateId;
  if (typeof t !== "string" || !t.trim()) return null;
  const raw = body.workflowInput;
  const input =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : undefined;
  return { templateId: t.trim(), input };
}

/** SSE one-frame writer matching the chat.ts convention (`data: <json>\n\n`). */
function frame(res: Response, obj: unknown): void {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

/**
 * Dispatch a typed workflow over the chat SSE channel. Validates the template,
 * creates a run, enqueues the job, and emits the initial progress + a
 * `workflow_dispatched` event carrying the runId and poll URL.
 */
export async function streamWorkflowDispatch(
  res: Response,
  args: { userId: string; templateId: string; input?: Record<string, unknown> },
): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const template = getTemplate(args.templateId);
  if (!template || validateTemplate(template).length > 0) {
    frame(res, { type: "error", error: `unknown or invalid template "${args.templateId}"` });
    res.end();
    return;
  }

  const run = await runStore.create({
    userId: args.userId,
    templateId: args.templateId,
    input: args.input,
  });
  const enq = await queues.workflows.add(WORKFLOWS_RUN, {
    runId: run.id,
    userId: args.userId,
    templateId: args.templateId,
  });

  // toSSE returns a complete `data: <json>\n\n` frame — write it directly.
  res.write(
    toSSE(
      progressFromRun(run, {
        message: enq.skipped
          ? "queued (worker unavailable — start the worker to run it)"
          : "dispatched",
      }),
    ),
  );
  frame(res, {
    type: "workflow_dispatched",
    runId: run.id,
    jobSkipped: enq.skipped ?? false,
    poll: `/api/workflows/${run.id}`,
  });
  res.end();
}
