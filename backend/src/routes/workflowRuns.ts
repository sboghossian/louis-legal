/**
 * Workflow orchestration API (Wave 2, Slice 2b).
 *
 * Mounted at `/api/workflows` (distinct from the legacy `/workflows` prompt-row
 * router). Starts typed multi-step workflow runs as BullMQ `workflows.run` jobs
 * (never in the request) and exposes status + the mandatory human gate.
 *
 *   GET  /api/workflows/templates        list seed templates
 *   POST /api/workflows                  start a run { templateId, input? } → 202
 *   GET  /api/workflows                  list the caller's runs
 *   GET  /api/workflows/:runId           run status (owner-scoped)
 *   POST /api/workflows/:runId/approve   approve a gated run → resumes it
 *
 * The approve route encodes the /lecun-world-model stance (ADR #5): a run that
 * pauses at a side-effect/gated step only proceeds on an explicit human approval.
 */
import { Router } from "express";

import { requireAuth } from "../middleware/auth";
import { queues } from "../queue";
import { JOB_NAME as WORKFLOWS_RUN } from "../queue/jobs/workflows.run";
import { runStore } from "../workflows/factory";
import { getTemplate, listTemplates, validateTemplate } from "../workflows/templates/registry";

export const workflowRunsRouter = Router();
workflowRunsRouter.use(requireAuth);

/** List the seed templates (id, title, description, step count). */
workflowRunsRouter.get("/templates", (_req, res) => {
  res.json({
    templates: listTemplates().map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      steps: t.steps.length,
    })),
  });
});

/** Start a run: validate the template, create the run, enqueue the job. */
workflowRunsRouter.post("/", async (req, res) => {
  const userId = res.locals.userId as string;
  const templateId = req.body?.templateId;
  if (typeof templateId !== "string" || !templateId.trim()) {
    res.status(400).json({ error: "templateId must be a non-empty string" });
    return;
  }
  const template = getTemplate(templateId);
  if (!template) {
    res.status(404).json({ error: `unknown template "${templateId}"` });
    return;
  }
  const problems = validateTemplate(template);
  if (problems.length > 0) {
    res.status(500).json({ error: "template is invalid", problems });
    return;
  }
  const input =
    req.body?.input && typeof req.body.input === "object" ? req.body.input : undefined;

  const run = await runStore.create({ userId, templateId, input });
  const enq = await queues.workflows.add(WORKFLOWS_RUN, {
    runId: run.id,
    userId,
    templateId,
  });

  res.status(202).json({ run, job: { id: enq.id, skipped: enq.skipped ?? false } });
});

/** List the caller's runs (newest first). */
workflowRunsRouter.get("/", async (_req, res) => {
  const userId = res.locals.userId as string;
  res.json({ runs: await runStore.list(userId) });
});

/** Run status, owner-scoped. */
workflowRunsRouter.get("/:runId", async (req, res) => {
  const userId = res.locals.userId as string;
  const run = await runStore.get(req.params.runId);
  if (!run || run.userId !== userId) {
    res.status(404).json({ error: "run not found" });
    return;
  }
  res.json({ run });
});

/** Approve a gated run → re-enqueue the job, which resumes from the gate. */
workflowRunsRouter.post("/:runId/approve", async (req, res) => {
  const userId = res.locals.userId as string;
  const run = await runStore.get(req.params.runId);
  if (!run || run.userId !== userId) {
    res.status(404).json({ error: "run not found" });
    return;
  }
  if (run.status !== "gated") {
    res.status(409).json({ error: `run is not awaiting approval (status: ${run.status})` });
    return;
  }
  const enq = await queues.workflows.add(WORKFLOWS_RUN, {
    runId: run.id,
    userId,
    templateId: run.templateId,
  });
  res.status(202).json({ run, job: { id: enq.id, skipped: enq.skipped ?? false } });
});
