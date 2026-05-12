import { Router, Request, Response } from "express";
import { listFlows, getFlow } from "../legalFlows/_templates";
import { startFlow, getRun, listRuns, completeStep, pauseRun, resumeRun, abandonRun, setInputs } from "../legalFlows/_store";

export const legalFlowsRouter = Router();

function userIdFrom(req: Request, res: Response): string {
  return (req.headers["x-user-id"] as string) || (res.locals?.userId as string) || "demo";
}

// Templates
legalFlowsRouter.get("/templates", (_req: Request, res: Response) => {
  res.json({ templates: listFlows() });
});

legalFlowsRouter.get("/templates/:id", (req: Request, res: Response) => {
  const tmpl = getFlow(req.params.id);
  if (!tmpl) {
    res.status(404).json({ error: "Flow template not found" });
    return;
  }
  res.json(tmpl);
});

// Runs
legalFlowsRouter.get("/runs", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const { status, matterId } = req.query as Record<string, string | undefined>;
  const runs = listRuns(userId, { status: status as any, matterId });
  res.json({ runs });
});

legalFlowsRouter.post("/runs", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const { flowId, matterId, inputs } = req.body ?? {};
  if (!flowId) {
    res.status(400).json({ error: "flowId required" });
    return;
  }
  try {
    const run = startFlow(userId, flowId, matterId, inputs ?? {});
    res.status(201).json(run);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

legalFlowsRouter.get("/runs/:id", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const run = getRun(req.params.id, userId);
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  const tmpl = getFlow(run.flowId);
  res.json({ run, template: tmpl });
});

legalFlowsRouter.post("/runs/:id/complete-step", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const { output, note } = req.body ?? {};
  const run = completeStep(req.params.id, userId, output ?? {}, note);
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(run);
});

legalFlowsRouter.post("/runs/:id/pause", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const run = pauseRun(req.params.id, userId);
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(run);
});

legalFlowsRouter.post("/runs/:id/resume", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const run = resumeRun(req.params.id, userId);
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(run);
});

legalFlowsRouter.post("/runs/:id/abandon", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const run = abandonRun(req.params.id, userId);
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(run);
});

legalFlowsRouter.patch("/runs/:id/inputs", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const run = setInputs(req.params.id, userId, req.body ?? {});
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(run);
});
