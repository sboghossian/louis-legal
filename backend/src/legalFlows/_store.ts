/**
 * Legal Flow Run Store — track ongoing flow runs (in-memory; SQL TODO below).
 *
 * Future SQL:
 *
 * CREATE TABLE flow_runs (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id text NOT NULL,
 *   matter_id uuid REFERENCES matters(id),
 *   flow_id text NOT NULL,
 *   status text NOT NULL DEFAULT 'active',  -- active | paused | completed | abandoned
 *   current_step_id text,
 *   step_history jsonb DEFAULT '[]',         -- [{ stepId, startedAt, completedAt, output, ... }]
 *   inputs jsonb DEFAULT '{}',
 *   outputs jsonb DEFAULT '{}',
 *   created_at timestamptz NOT NULL DEFAULT now(),
 *   updated_at timestamptz NOT NULL DEFAULT now()
 * );
 */

import crypto from "crypto";
import { getFlow, FlowTemplate } from "./_templates";

export interface StepLogEntry {
  stepId: string;
  startedAt: string;
  completedAt?: string;
  output?: Record<string, unknown>;
  note?: string;
  reviewedBy?: string;
}

export interface FlowRun {
  id: string;
  userId: string;
  matterId?: string;
  flowId: string;
  status: "active" | "paused" | "completed" | "abandoned";
  currentStepId: string;
  stepHistory: StepLogEntry[];
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const RUNS = new Map<string, FlowRun>();

export function startFlow(userId: string, flowId: string, matterId?: string, initialInputs: Record<string, unknown> = {}): FlowRun {
  const template = getFlow(flowId);
  if (!template) throw new Error(`Flow not found: ${flowId}`);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const run: FlowRun = {
    id,
    userId,
    matterId,
    flowId,
    status: "active",
    currentStepId: template.steps[0].id,
    stepHistory: [{ stepId: template.steps[0].id, startedAt: now }],
    inputs: initialInputs,
    outputs: {},
    createdAt: now,
    updatedAt: now,
  };
  RUNS.set(id, run);
  return run;
}

export function getRun(id: string, userId: string): FlowRun | undefined {
  const run = RUNS.get(id);
  if (!run || run.userId !== userId) return undefined;
  return run;
}

export function listRuns(userId: string, filters: { status?: FlowRun["status"]; matterId?: string } = {}): FlowRun[] {
  return Array.from(RUNS.values())
    .filter(r => r.userId === userId)
    .filter(r => !filters.status || r.status === filters.status)
    .filter(r => !filters.matterId || r.matterId === filters.matterId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function completeStep(id: string, userId: string, output: Record<string, unknown>, note?: string): FlowRun | undefined {
  const run = getRun(id, userId);
  if (!run) return undefined;
  const template = getFlow(run.flowId);
  if (!template) return undefined;

  // Update current step
  const lastEntry = run.stepHistory[run.stepHistory.length - 1];
  if (lastEntry.stepId === run.currentStepId && !lastEntry.completedAt) {
    lastEntry.completedAt = new Date().toISOString();
    lastEntry.output = output;
    lastEntry.note = note;
  }
  // Merge into outputs
  run.outputs = { ...run.outputs, ...output };

  // Determine next step
  const stepIdx = template.steps.findIndex(s => s.id === run.currentStepId);
  const nextStep = template.steps[stepIdx + 1];
  if (nextStep) {
    run.currentStepId = nextStep.id;
    run.stepHistory.push({ stepId: nextStep.id, startedAt: new Date().toISOString() });
  } else {
    run.status = "completed";
  }
  run.updatedAt = new Date().toISOString();
  return run;
}

export function pauseRun(id: string, userId: string): FlowRun | undefined {
  const run = getRun(id, userId);
  if (!run) return undefined;
  run.status = "paused";
  run.updatedAt = new Date().toISOString();
  return run;
}

export function resumeRun(id: string, userId: string): FlowRun | undefined {
  const run = getRun(id, userId);
  if (!run) return undefined;
  if (run.status === "completed") return run;
  run.status = "active";
  run.updatedAt = new Date().toISOString();
  return run;
}

export function abandonRun(id: string, userId: string): FlowRun | undefined {
  const run = getRun(id, userId);
  if (!run) return undefined;
  run.status = "abandoned";
  run.updatedAt = new Date().toISOString();
  return run;
}

export function setInputs(id: string, userId: string, additionalInputs: Record<string, unknown>): FlowRun | undefined {
  const run = getRun(id, userId);
  if (!run) return undefined;
  run.inputs = { ...run.inputs, ...additionalInputs };
  run.updatedAt = new Date().toISOString();
  return run;
}
