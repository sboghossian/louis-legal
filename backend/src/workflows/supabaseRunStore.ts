/**
 * Supabase-backed {@link WorkflowRunStore} (Wave 2, Slice 2a).
 *
 * Same contract as {@link InMemoryRunStore}, but rows live in the
 * `workflow_runs` table so runs survive restarts and are shared across
 * instances. Lifecycle transitions reuse the same {@link canTransition} rules.
 * Findings and free-form input are stored as JSONB; the pure {@link rowToRun} /
 * {@link runToRow} mappers convert between snake_case rows and the domain shape.
 *
 * Like the memory store, single-row mutations are read-modify-write (acceptable
 * at current scale: a run is touched serially by its own orchestrator job). The
 * destructive {@link clear} is hard-blocked in production.
 *
 * Migration: `backend/migrations/2026-05-22-workflow-runs.sql`.
 */

import crypto from "crypto";

import { createServerSupabase } from "../lib/supabase";
import { canTransition } from "./runStore";
import type {
  Finding,
  RunInput,
  RunPatch,
  RunStatus,
  TransitionOptions,
  WorkflowRun,
  WorkflowRunStore,
} from "./types";

const TABLE = "workflow_runs";

/** Safety cap on rows returned by {@link SupabaseRunStore.list}. */
const MAX_LIST_ROWS = 500;

/** Database row shape for `workflow_runs` (snake_case columns). */
export interface WorkflowRunRow {
  id: string;
  user_id: string;
  template_id: string;
  status: string;
  current_step_index: number;
  findings: Finding[];
  input: Record<string, unknown> | null;
  deliverable: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/** Pure: DB row → domain run. */
export function rowToRun(row: WorkflowRunRow): WorkflowRun {
  const run: WorkflowRun = {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id,
    status: row.status as RunStatus,
    currentStepIndex: row.current_step_index,
    findings: row.findings ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.input != null) run.input = row.input;
  if (row.deliverable != null) run.deliverable = row.deliverable;
  if (row.error != null) run.error = row.error;
  return run;
}

/** Pure: domain run → DB row. Absent optionals become null columns. */
export function runToRow(run: WorkflowRun): WorkflowRunRow {
  return {
    id: run.id,
    user_id: run.userId,
    template_id: run.templateId,
    status: run.status,
    current_step_index: run.currentStepIndex,
    findings: run.findings,
    input: run.input ?? null,
    deliverable: run.deliverable ?? null,
    error: run.error ?? null,
    created_at: run.createdAt,
    updated_at: run.updatedAt,
  };
}

export class SupabaseRunStore implements WorkflowRunStore {
  constructor(private readonly db: ReturnType<typeof createServerSupabase>) {}

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

    const { error } = await this.db.from(TABLE).insert(runToRow(run));
    if (error) throw new Error(`workflow run create failed: ${error.message}`);
    return run;
  }

  async get(id: string): Promise<WorkflowRun | undefined> {
    const { data, error } = await this.db.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`workflow run get failed: ${error.message}`);
    return data ? rowToRun(data as WorkflowRunRow) : undefined;
  }

  async list(userId: string): Promise<WorkflowRun[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_LIST_ROWS);
    if (error) throw new Error(`workflow run list failed: ${error.message}`);
    return ((data ?? []) as WorkflowRunRow[]).map(rowToRun);
  }

  /** Read-modify-write a single run (see class note on atomicity). */
  private async mutate(
    id: string,
    apply: (r: WorkflowRun) => void,
  ): Promise<WorkflowRun | undefined> {
    const run = await this.get(id);
    if (!run) return undefined;
    apply(run);
    const { error } = await this.db.from(TABLE).update(runToRow(run)).eq("id", id);
    if (error) throw new Error(`workflow run update failed: ${error.message}`);
    return run;
  }

  async transition(
    id: string,
    to: RunStatus,
    opts: TransitionOptions = {},
  ): Promise<WorkflowRun | undefined> {
    const current = await this.get(id);
    if (!current) return undefined;
    if (!canTransition(current.status, to)) {
      throw new Error(`illegal run transition: ${current.status} → ${to}`);
    }
    return this.mutate(id, (r) => {
      r.status = to;
      if (to === "failed" && opts.error !== undefined) r.error = opts.error;
      r.updatedAt = opts.now ?? new Date().toISOString();
    });
  }

  async update(id: string, patch: RunPatch, now?: string): Promise<WorkflowRun | undefined> {
    return this.mutate(id, (r) => {
      if (patch.currentStepIndex !== undefined) r.currentStepIndex = patch.currentStepIndex;
      if (patch.deliverable !== undefined) r.deliverable = patch.deliverable;
      if (patch.error !== undefined) r.error = patch.error;
      if (patch.input !== undefined) r.input = patch.input;
      r.updatedAt = now ?? new Date().toISOString();
    });
  }

  async addFinding(id: string, finding: Finding, now?: string): Promise<WorkflowRun | undefined> {
    return this.mutate(id, (r) => {
      r.findings.push(finding);
      r.updatedAt = now ?? new Date().toISOString();
    });
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await this.db.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(`workflow run delete failed: ${error.message}`);
    return true;
  }

  async clear(): Promise<void> {
    // Destructive: deletes EVERY row (all users). Test/reset only — hard-blocked
    // in production so a misrouted call can't wipe live runs.
    if (process.env.NODE_ENV === "production") {
      throw new Error("SupabaseRunStore.clear() is disabled in production");
    }
    const { error } = await this.db.from(TABLE).delete().neq("id", "");
    if (error) throw new Error(`workflow run clear failed: ${error.message}`);
  }
}
