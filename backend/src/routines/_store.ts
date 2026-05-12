/**
 * Routines — recurring AI tasks (daily digest, weekly newsletter, regulator
 * alerts, deadline sweeps, etc.).
 *
 * In-memory store. Future SQL:
 *
 * CREATE TABLE routines (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id text NOT NULL,
 *   title text NOT NULL,
 *   description text,
 *   schedule_cron text NOT NULL,
 *   timezone text DEFAULT 'Asia/Beirut',
 *   prompt text NOT NULL,
 *   output_channel text NOT NULL,         -- email | slack | in-app
 *   enabled boolean DEFAULT true,
 *   last_run_at timestamptz,
 *   next_run_at timestamptz,
 *   created_at timestamptz DEFAULT now(),
 *   updated_at timestamptz DEFAULT now()
 * );
 *
 * CREATE TABLE routine_runs (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   routine_id uuid REFERENCES routines(id),
 *   started_at timestamptz NOT NULL,
 *   completed_at timestamptz,
 *   output text,
 *   error text,
 *   status text NOT NULL                  -- running | succeeded | failed
 * );
 */

import crypto from "crypto";

export type OutputChannel = "email" | "slack" | "in-app";
export type RoutineKind = "digest" | "alert" | "newsletter" | "report" | "deadline-sweep" | "custom";

export interface Routine {
  id: string;
  userId: string;
  title: string;
  description?: string;
  schedule: string;
  timezone: string;
  prompt: string;
  outputChannel: OutputChannel;
  kind: RoutineKind;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineRun {
  id: string;
  routineId: string;
  startedAt: string;
  completedAt?: string;
  output?: string;
  error?: string;
  status: "running" | "succeeded" | "failed";
}

const ROUTINES = new Map<string, Routine>();
const RUNS = new Map<string, RoutineRun[]>();

export function createRoutine(input: Omit<Routine, "id" | "createdAt" | "updatedAt">): Routine {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const routine: Routine = { ...input, id, createdAt: now, updatedAt: now };
  ROUTINES.set(id, routine);
  RUNS.set(id, []);
  return routine;
}

export function getRoutine(id: string, userId: string): Routine | undefined {
  const r = ROUTINES.get(id);
  if (!r || r.userId !== userId) return undefined;
  return r;
}

export function listRoutines(userId: string): Routine[] {
  return Array.from(ROUTINES.values())
    .filter(r => r.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function updateRoutine(id: string, userId: string, updates: Partial<Routine>): Routine | undefined {
  const r = ROUTINES.get(id);
  if (!r || r.userId !== userId) return undefined;
  const updated = { ...r, ...updates, id: r.id, userId: r.userId, createdAt: r.createdAt, updatedAt: new Date().toISOString() };
  ROUTINES.set(id, updated);
  return updated;
}

export function deleteRoutine(id: string, userId: string): boolean {
  const r = ROUTINES.get(id);
  if (!r || r.userId !== userId) return false;
  ROUTINES.delete(id);
  RUNS.delete(id);
  return true;
}

export function triggerRoutineRun(id: string, userId: string): RoutineRun | undefined {
  const r = ROUTINES.get(id);
  if (!r || r.userId !== userId) return undefined;
  const now = new Date().toISOString();
  const run: RoutineRun = {
    id: crypto.randomUUID(),
    routineId: id,
    startedAt: now,
    status: "running",
  };
  const list = RUNS.get(id) || [];
  list.unshift(run);
  RUNS.set(id, list);

  // Simulate completion immediately (real impl would queue this on a worker)
  setTimeout(() => {
    run.completedAt = new Date().toISOString();
    run.status = "succeeded";
    run.output = simulateOutput(r);
    const r2 = ROUTINES.get(id);
    if (r2) {
      r2.lastRunAt = run.completedAt;
      r2.updatedAt = run.completedAt;
    }
  }, 50);
  return run;
}

export function listRuns(routineId: string, userId: string): RoutineRun[] {
  const r = ROUTINES.get(routineId);
  if (!r || r.userId !== userId) return [];
  return RUNS.get(routineId) || [];
}

function simulateOutput(r: Routine): string {
  switch (r.kind) {
    case "digest":
      return `Daily digest (${new Date().toLocaleDateString()})\n\n• 3 new regulatory updates\n• 2 deadlines in next 7 days\n• 1 new clause-library addition\n\nFull report attached.`;
    case "alert":
      return "No alerts triggered in last 24h.";
    case "newsletter":
      return "Weekly newsletter compiled and queued for distribution.";
    case "report":
      return "Report generated. Open in Louis to review.";
    case "deadline-sweep":
      return "Deadline sweep complete. 2 deadlines flagged for follow-up.";
    default:
      return "Custom routine completed.";
  }
}

// Seed demo routines
if (process.env.NODE_ENV !== "production") {
  const demoUserId = "demo";
  if (!Array.from(ROUTINES.values()).find(r => r.userId === demoUserId)) {
    createRoutine({
      userId: demoUserId,
      title: "Daily Regulatory Digest — MENA",
      description: "Summary of new gazette entries, SDAIA / SAMA / CBUAE / BDL guidance, regulator bulletins.",
      schedule: "0 8 * * 1-5",
      timezone: "Asia/Beirut",
      prompt: "Summarize new regulatory updates in KSA, UAE, and Lebanon from the past 24 hours. Focus on banking, data protection, and AML.",
      outputChannel: "email",
      kind: "digest",
      enabled: true,
      lastRunAt: new Date().toISOString(),
    });
    createRoutine({
      userId: demoUserId,
      title: "Friday Newsletter — In-house Counsel",
      description: "Weekly status synthesis of all matters + commercial team highlights.",
      schedule: "0 9 * * 5",
      timezone: "Asia/Beirut",
      prompt: "Compile a Friday newsletter for in-house counsel: top 3 matter updates, contract pipeline status, regulatory changes, and upcoming deadlines.",
      outputChannel: "email",
      kind: "newsletter",
      enabled: true,
    });
    createRoutine({
      userId: demoUserId,
      title: "Sanctions Watch — Counterparty List",
      description: "Re-screens all matter counterparties against OFAC / UN / EU lists.",
      schedule: "0 6 * * *",
      timezone: "Asia/Beirut",
      prompt: "Run sanctions screening on every counterparty in active matters. Flag any new hits.",
      outputChannel: "in-app",
      kind: "alert",
      enabled: true,
    });
    createRoutine({
      userId: demoUserId,
      title: "Weekly Deadline Sweep",
      description: "Surfaces deadlines coming up in the next 7-14 days across all matters.",
      schedule: "0 9 * * 1",
      timezone: "Asia/Beirut",
      prompt: "Sweep all matters for deadlines in the next 14 days. Group by urgency.",
      outputChannel: "slack",
      kind: "deadline-sweep",
      enabled: false,
    });
  }
}
