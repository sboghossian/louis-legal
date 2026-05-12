import { Router, Request, Response } from "express";
import {
  createRoutine, getRoutine, listRoutines, updateRoutine, deleteRoutine,
  triggerRoutineRun, listRuns,
} from "../routines/_store";

export const routinesRouter = Router();

function userIdFrom(req: Request, res: Response): string {
  return (req.headers["x-user-id"] as string) || (res.locals?.userId as string) || "demo";
}

routinesRouter.get("/", (req: Request, res: Response) => {
  res.json({ routines: listRoutines(userIdFrom(req, res)) });
});

routinesRouter.post("/", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const body = req.body ?? {};
  if (!body.title || !body.schedule || !body.prompt) {
    res.status(400).json({ error: "title, schedule, prompt required" });
    return;
  }
  const routine = createRoutine({
    userId,
    title: body.title,
    description: body.description,
    schedule: body.schedule,
    timezone: body.timezone || "Asia/Beirut",
    prompt: body.prompt,
    outputChannel: body.outputChannel || "in-app",
    kind: body.kind || "custom",
    enabled: body.enabled ?? true,
  });
  res.status(201).json(routine);
});

routinesRouter.get("/:id", (req: Request, res: Response) => {
  const r = getRoutine(req.params.id, userIdFrom(req, res));
  if (!r) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ routine: r, runs: listRuns(req.params.id, userIdFrom(req, res)) });
});

routinesRouter.patch("/:id", (req: Request, res: Response) => {
  const updated = updateRoutine(req.params.id, userIdFrom(req, res), req.body ?? {});
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

routinesRouter.delete("/:id", (req: Request, res: Response) => {
  const ok = deleteRoutine(req.params.id, userIdFrom(req, res));
  if (!ok) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

routinesRouter.post("/:id/run", (req: Request, res: Response) => {
  const run = triggerRoutineRun(req.params.id, userIdFrom(req, res));
  if (!run) { res.status(404).json({ error: "Not found" }); return; }
  res.status(202).json(run);
});

routinesRouter.get("/:id/runs", (req: Request, res: Response) => {
  res.json({ runs: listRuns(req.params.id, userIdFrom(req, res)) });
});
