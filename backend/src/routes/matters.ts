import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createMatter, getMatter, listMatters, updateMatter, deleteMatter,
  addEvent, listEvents, runConflictCheck, matterStats,
  MatterStatus, MatterType,
} from "../matters/_store";

export const mattersRouter = Router();

mattersRouter.use(requireAuth);

mattersRouter.get("/", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const { status, matterType, q } = req.query as Record<string, string | undefined>;
  const matters = listMatters(userId, {
    status: status as MatterStatus | undefined,
    matterType: matterType as MatterType | undefined,
    q,
  });
  res.json({ total: matters.length, matters });
});

mattersRouter.get("/stats", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  res.json(matterStats(userId));
});

mattersRouter.post("/", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const body = req.body ?? {};
  if (!body.matterNumber || !body.clientName || !body.matterType) {
    res.status(400).json({ error: "matterNumber, clientName, matterType are required" });
    return;
  }
  const matter = createMatter({
    userId,
    matterNumber: body.matterNumber,
    clientName: body.clientName,
    matterType: body.matterType,
    practiceArea: body.practiceArea,
    status: body.status || "open",
    jurisdictions: body.jurisdictions || [],
    parties: body.parties || [],
    description: body.description,
    responsibleAttorney: body.responsibleAttorney,
    budgetAmount: body.budgetAmount,
    budgetCurrency: body.budgetCurrency,
  });
  res.status(201).json(matter);
});

mattersRouter.post("/conflict-check", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const { parties } = req.body ?? {};
  if (!Array.isArray(parties) || parties.length === 0) {
    res.status(400).json({ error: "parties array required (each with name + role)" });
    return;
  }
  const hits = runConflictCheck(userId, parties);
  res.json({ checked: parties.length, hits });
});

mattersRouter.get("/:id", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const m = getMatter(req.params.id, userId);
  if (!m) {
    res.status(404).json({ error: "Matter not found" });
    return;
  }
  const events = listEvents(req.params.id);
  res.json({ matter: m, events });
});

mattersRouter.patch("/:id", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const updated = updateMatter(req.params.id, userId, req.body ?? {});
  if (!updated) {
    res.status(404).json({ error: "Matter not found" });
    return;
  }
  res.json(updated);
});

mattersRouter.delete("/:id", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const ok = deleteMatter(req.params.id, userId);
  if (!ok) {
    res.status(404).json({ error: "Matter not found" });
    return;
  }
  res.status(204).end();
});

mattersRouter.post("/:id/events", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const m = getMatter(req.params.id, userId);
  if (!m) {
    res.status(404).json({ error: "Matter not found" });
    return;
  }
  const { eventType, description, eventDate, metadata } = req.body ?? {};
  if (!eventType || !description) {
    res.status(400).json({ error: "eventType and description required" });
    return;
  }
  const evt = addEvent(req.params.id, { eventType, description, eventDate, metadata, createdBy: userId });
  res.status(201).json(evt);
});

mattersRouter.get("/:id/events", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const m = getMatter(req.params.id, userId);
  if (!m) {
    res.status(404).json({ error: "Matter not found" });
    return;
  }
  res.json({ events: listEvents(req.params.id) });
});
