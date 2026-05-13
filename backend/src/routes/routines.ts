import { Router, Request, Response } from "express";
import {
  createRoutine, getRoutine, listRoutines, updateRoutine, deleteRoutine,
  triggerRoutineRun, listRuns,
} from "../routines/_store";
import { queues, findJob } from "../queue";

export const routinesRouter = Router();

function userIdFrom(req: Request, res: Response): string {
  return (req.headers["x-user-id"] as string) || (res.locals?.userId as string) || "demo";
}

/** Map a routine kind to the queued job name. */
function jobNameForKind(kind: string): string {
  switch (kind) {
    case "digest":
    case "newsletter":
    case "report":
      return "routines.daily-digest";
    case "deadline-sweep":
    case "alert":
      return "routines.deadline-reminder";
    default:
      return "routines.daily-digest";
  }
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

routinesRouter.post("/:id/run", async (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const routine = getRoutine(req.params.id, userId);
  if (!routine) { res.status(404).json({ error: "Not found" }); return; }

  // Record the run in the in-memory ledger so existing UI keeps working,
  // then enqueue real work on BullMQ. The handler returns immediately —
  // status is polled via GET /api/routines/jobs/:id.
  const run = triggerRoutineRun(req.params.id, userId);

  try {
    const jobName = jobNameForKind(routine.kind);
    // All routine jobs land on the `routines` queue; the prefix of the job
    // name doubles as the queue selector for any future routing.
    const enq = await queues.routines.add(jobName, {
      userId,
      routineId: routine.id,
    });
    res.status(202).json({ ...run, jobId: enq.id, queued: !enq.skipped });
  } catch (e) {
    // Queue failed entirely — fall back to the legacy in-process behaviour
    // (the store already simulated a "succeeded" run on setTimeout).
    res.status(202).json({ ...run, jobId: null, queued: false, error: String(e) });
  }
});

routinesRouter.get("/:id/runs", (req: Request, res: Response) => {
  res.json({ runs: listRuns(req.params.id, userIdFrom(req, res)) });
});

// Poll job status. Looks across every queue since the caller only has the id.
routinesRouter.get("/jobs/:id", async (req: Request, res: Response) => {
  const job = await findJob(req.params.id);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});
