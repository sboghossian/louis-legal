/**
 * Inbox — unified view of notifications, matter updates, routine outputs,
 * and team activity. Aggregates from existing stores.
 */
import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { listMatters } from "../matters/_store";
import { listRoutines, listRuns } from "../routines/_store";

export const inboxRouter = Router();

inboxRouter.use(requireAuth);

export type InboxEntryKind = "matter-event" | "routine-output" | "deadline" | "system" | "team-invite" | "billing";

export interface InboxEntry {
  id: string;
  kind: InboxEntryKind;
  title: string;
  body?: string;
  matterId?: string;
  routineId?: string;
  severity: "info" | "warning" | "urgent";
  read: boolean;
  createdAt: string;
  link?: string;
}

const READ_STATE = new Map<string, Set<string>>(); // userId -> Set<entryId>

function isRead(userId: string, entryId: string): boolean {
  return READ_STATE.get(userId)?.has(entryId) ?? false;
}

inboxRouter.get("/", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const entries: InboxEntry[] = [];

  // Recent matter events
  const matters = listMatters(userId);
  for (const m of matters.slice(0, 20)) {
    const id = `matter-${m.id}`;
    entries.push({
      id,
      kind: "matter-event",
      title: `Matter updated: ${m.clientName}`,
      body: `#${m.matterNumber} · status ${m.status}`,
      matterId: m.id,
      severity: m.status === "open" ? "info" : "info",
      read: isRead(userId, id),
      createdAt: m.updatedAt,
      link: `/matters`,
    });
  }

  // Recent routine outputs
  const routines = listRoutines(userId);
  for (const r of routines) {
    const runs = listRuns(r.id, userId).slice(0, 3);
    for (const run of runs) {
      if (run.status !== "succeeded") continue;
      const id = `run-${run.id}`;
      entries.push({
        id,
        kind: "routine-output",
        title: `Routine ran: ${r.title}`,
        body: run.output?.slice(0, 200),
        routineId: r.id,
        severity: "info",
        read: isRead(userId, id),
        createdAt: run.completedAt || run.startedAt,
        link: `/routines`,
      });
    }
  }

  // System: a couple of seeded entries for demo realism
  if (matters.length > 0) {
    entries.push({
      id: "sys-welcome",
      kind: "system",
      title: "Welcome to Louis",
      body: "Tour the legal workbench: Clauses, Risk Scanner, Citations, Legal Flows.",
      severity: "info",
      read: isRead(userId, "sys-welcome"),
      createdAt: new Date(Date.now() - 24 * 3600_000).toISOString(),
      link: "/docs",
    });
  }

  // Sort newest first
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const unread = entries.filter(e => !e.read).length;
  res.json({ entries, unread });
});

inboxRouter.post("/:id/read", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  if (!READ_STATE.has(userId)) READ_STATE.set(userId, new Set());
  READ_STATE.get(userId)!.add(req.params.id);
  res.json({ ok: true });
});

inboxRouter.post("/read-all", (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  if (!READ_STATE.has(userId)) READ_STATE.set(userId, new Set());
  const set = READ_STATE.get(userId)!;
  // Just mark all currently-known IDs as read by re-running the GET logic
  const matters = listMatters(userId);
  for (const m of matters) set.add(`matter-${m.id}`);
  set.add("sys-welcome");
  res.json({ ok: true });
});
