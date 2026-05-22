/**
 * Public types for multi-agent workflow orchestration (Wave 2, Slice 2a).
 *
 * Modelled on Lavern's orchestrator (Apache-2.0, AnttiHero/lavern @ v0.15.0),
 * reshaped into a typed, code-defined template registry plus a persistence-
 * agnostic run store. Per ADR #3 (tasks/todo.md), workflow steps REUSE the
 * Processor v2 primitives (router + memory + cost governor + grounding) — there
 * is no second model stack here. This file therefore borrows the governor's
 * {@link ModelTier} rather than redefining it, so a step's declared tier feeds
 * straight into the cost governor in Slice 2b.
 *
 * Foundation contract only: pure data + the {@link WorkflowRunStore} interface.
 * No LLM, no network, no orchestration — everything here is unit-testable in
 * isolation and the run store has a swappable persistence seam mirroring the
 * memory store (in-memory ⇄ Supabase, env-gated).
 */

import type { ModelTier } from "../lib/llm/effort";

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

/**
 * One step of a workflow template. Steps run in array order. The named fields
 * mirror the resolved architecture in tasks/todo.md (intent, skillHint,
 * modelTier, gate?, sideEffect?); `id` and `citesDocuments` are added because
 * the orchestrator (2b) addresses steps by id and decides per-step whether to
 * run `verifyGrounding` on the output.
 */
export interface WorkflowStep {
  /** Stable id, unique within the template (e.g. "extract-parties"). */
  id: string;
  /** What this step is meant to do — also the instruction seed for the step. */
  intent: string;
  /**
   * Skill the router should prefer for this step. A SOFT hint: the router (2b)
   * may still pick a better-matching skill. Omit to let routing decide freely.
   */
  skillHint?: string;
  /** Cost-governor tier for this step (low / mid / main). */
  modelTier: ModelTier;
  /**
   * True when this step's output cites documents and must be grounding-verified
   * (ADR #3: `verifyGrounding` on doc-citing output). Defaults to false.
   */
  citesDocuments?: boolean;
  /**
   * True when the step has a real-world side effect (send / file / submit /
   * transact / mutate shared state). A side-effect step MUST also set
   * `gate:true` — enforced by {@link validateTemplate}. Defaults to false.
   */
  sideEffect?: boolean;
  /**
   * True when the run must pause for explicit human approval before this step
   * executes (encodes the /lecun-world-model stance — ADR #5). Defaults to
   * false. Always true for side-effect steps.
   */
  gate?: boolean;
}

/**
 * A typed, code-defined workflow template. v1 ships a fixed seed set
 * ({@link listTemplates}); user-authoring is deferred (tasks/todo.md).
 */
export interface WorkflowTemplate {
  /** Stable id used to start a run (e.g. "contract-review"). */
  id: string;
  /** Human-readable name for listing UIs. */
  title: string;
  /** One-line summary of what the workflow produces. */
  description: string;
  /** Ordered steps; the orchestrator runs them front-to-back. */
  steps: WorkflowStep[];
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

/**
 * Traffic-light severity for a workflow finding. A superset of the quality
 * module's RED|YELLOW vocabulary, with GREEN for a checked-and-clean /
 * informational result. The bounded adversarial Full-Bench (Slice 2c) runs on
 * RED findings only.
 */
export type FindingSeverity = "RED" | "YELLOW" | "GREEN";

/** A single structured finding emitted by a workflow step. */
export interface Finding {
  /** Unique id within the run. */
  id: string;
  /** Id of the {@link WorkflowStep} that produced this finding. */
  stepId: string;
  severity: FindingSeverity;
  /** Short headline (e.g. "Unilateral termination right"). */
  title: string;
  /** Explanation and quoted evidence. */
  detail: string;
  /** Optional source references this finding rests on (doc ids / clause refs). */
  citations?: string[];
}

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

/**
 * Lifecycle of a workflow run:
 *
 *   queued → running → (gated → running)* → assembling → done
 *                 └──────────────┴──────────────┴────────→ failed
 *
 * Legal transitions are declared in {@link VALID_TRANSITIONS}; `done` and
 * `failed` are terminal.
 */
export type RunStatus =
  | "queued"
  | "running"
  | "gated"
  | "assembling"
  | "done"
  | "failed";

/** A single workflow execution instance. */
export interface WorkflowRun {
  id: string;
  /** Owner. Every list read is user-scoped (mirrors the memory store). */
  userId: string;
  /** Template this run instantiates. */
  templateId: string;
  status: RunStatus;
  /**
   * Index of the next step to execute. While `gated`, points AT the step
   * awaiting approval; resuming runs that step then advances.
   */
  currentStepIndex: number;
  /** Findings accumulated across steps so far. */
  findings: Finding[];
  /** Free-form run parameters (matter id, document refs, options). */
  input?: Record<string, unknown>;
  /** Assembled deliverable, set during the assembling → done phase. */
  deliverable?: string;
  /** Failure reason; set only when `status === "failed"`. */
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/** Input to {@link WorkflowRunStore.create}. Defaults are filled by the store. */
export interface RunInput {
  userId: string;
  templateId: string;
  input?: Record<string, unknown>;
  /** ISO timestamp override for deterministic tests. Defaults to now. */
  now?: string;
}

/**
 * Mutable run fields patchable via {@link WorkflowRunStore.update}. Status is
 * deliberately excluded — it changes only through
 * {@link WorkflowRunStore.transition}, which validates the transition.
 */
export interface RunPatch {
  currentStepIndex?: number;
  deliverable?: string;
  error?: string;
  input?: Record<string, unknown>;
}

/** Options for {@link WorkflowRunStore.transition}. */
export interface TransitionOptions {
  /** ISO "now" override for deterministic tests. */
  now?: string;
  /** Failure reason, recorded when transitioning to `failed`. */
  error?: string;
}

/**
 * Persistence-agnostic workflow run store. Async so the same interface backs
 * both the in-memory implementation ({@link InMemoryRunStore}) and a Supabase-
 * backed one (`SupabaseRunStore`) without changing call sites — exactly as the
 * memory store does.
 */
export interface WorkflowRunStore {
  /** Create a new run in status `queued` at step 0; returns the entry. */
  create(input: RunInput): Promise<WorkflowRun>;
  /** Read one run by id (caller checks ownership; see {@link list}). */
  get(id: string): Promise<WorkflowRun | undefined>;
  /** List a user's runs, newest first. User-scoped — no cross-user reads. */
  list(userId: string): Promise<WorkflowRun[]>;
  /**
   * Change run status. Throws on an illegal transition
   * (see {@link VALID_TRANSITIONS}). Returns undefined if the run is unknown.
   */
  transition(id: string, to: RunStatus, opts?: TransitionOptions): Promise<WorkflowRun | undefined>;
  /** Patch mutable fields (not status). */
  update(id: string, patch: RunPatch, now?: string): Promise<WorkflowRun | undefined>;
  /** Append a finding to the run. */
  addFinding(id: string, finding: Finding, now?: string): Promise<WorkflowRun | undefined>;
  /** Delete a run (user cancel / test reset). Returns true if one was removed. */
  delete(id: string): Promise<boolean>;
  /** Drop everything (test/reset helper). */
  clear(): Promise<void>;
}
