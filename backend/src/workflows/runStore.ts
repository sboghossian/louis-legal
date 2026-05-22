/**
 * Workflow run store — in-memory implementation (Wave 2, Slice 2a).
 *
 * Implements {@link WorkflowRunStore}: create / read / list / status-transition /
 * patch / finding-append / delete, with validated lifecycle transitions. State
 * lives in a process-local Map; the persistence seam is the interface, so
 * {@link SupabaseRunStore} drops in later without changing call sites — exactly
 * as the memory store does.
 *
 * The transition table ({@link VALID_TRANSITIONS}) and {@link canTransition} are
 * exported so the Supabase store reuses the same lifecycle rules (mirrors how
 * `matchesTags`/`PROMOTION_THRESHOLD` are shared from the memory store).
 */

import crypto from "crypto";

import type {
  RunInput,
  RunPatch,
  RunStatus,
  TransitionOptions,
  WorkflowRun,
  WorkflowRunStore,
  Finding,
} from "./types";

/**
 * Legal status transitions. `done` and `failed` are terminal.
 *
 *   queued → running | failed
 *   running → gated | assembling | failed
 *   gated → running | failed
 *   assembling → done | failed
 */
export const VALID_TRANSITIONS: Record<RunStatus, readonly RunStatus[]> = {
  queued: ["running", "failed"],
  running: ["gated", "assembling", "failed"],
  gated: ["running", "failed"],
  assembling: ["done", "failed"],
  done: [],
  failed: [],
};

/** True if a run may move from `from` to `to`. */
export function canTransition(from: RunStatus, to: RunStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export class InMemoryRunStore implements WorkflowRunStore {
  private readonly runs = new Map<string, WorkflowRun>();

  async create(input: RunInput): Promise<WorkflowRun> {
    const now = input.now ?? new Date().toISOString();
    const run: WorkflowRun = {
      id: crypto.randomUUID(),
      userId: input.userId,
      templateId: input.templateId,
      status: "queued",
      currentStepIndex: 0,
      findings: [],
      createdAt: now,
      updatedAt: now,
    };
    if (input.input !== undefined) run.input = input.input;
    this.runs.set(run.id, run);
    return run;
  }

  async get(id: string): Promise<WorkflowRun | undefined> {
    return this.runs.get(id);
  }

  async list(userId: string): Promise<WorkflowRun[]> {
    return [...this.runs.values()]
      .filter((r) => r.userId === userId) // per-user isolation
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // newest first
  }

  async transition(
    id: string,
    to: RunStatus,
    opts: TransitionOptions = {},
  ): Promise<WorkflowRun | undefined> {
    const run = this.runs.get(id);
    if (!run) return undefined;
    if (!canTransition(run.status, to)) {
      throw new Error(`illegal run transition: ${run.status} → ${to}`);
    }
    run.status = to;
    if (to === "failed" && opts.error !== undefined) run.error = opts.error;
    run.updatedAt = opts.now ?? new Date().toISOString();
    return run;
  }

  async update(id: string, patch: RunPatch, now?: string): Promise<WorkflowRun | undefined> {
    const run = this.runs.get(id);
    if (!run) return undefined;
    if (patch.currentStepIndex !== undefined) run.currentStepIndex = patch.currentStepIndex;
    if (patch.deliverable !== undefined) run.deliverable = patch.deliverable;
    if (patch.error !== undefined) run.error = patch.error;
    if (patch.input !== undefined) run.input = patch.input;
    run.updatedAt = now ?? new Date().toISOString();
    return run;
  }

  async addFinding(id: string, finding: Finding, now?: string): Promise<WorkflowRun | undefined> {
    const run = this.runs.get(id);
    if (!run) return undefined;
    run.findings.push(finding);
    run.updatedAt = now ?? new Date().toISOString();
    return run;
  }

  async setFindings(id: string, findings: Finding[], now?: string): Promise<WorkflowRun | undefined> {
    const run = this.runs.get(id);
    if (!run) return undefined;
    run.findings = [...findings];
    run.updatedAt = now ?? new Date().toISOString();
    return run;
  }

  async delete(id: string): Promise<boolean> {
    return this.runs.delete(id);
  }

  async clear(): Promise<void> {
    this.runs.clear();
  }
}
