/**
 * Public API barrel for workflow orchestration (Wave 2).
 *
 * Slice 2a (foundation): typed templates + registry + persistence-agnostic run
 * store. The orchestrator engine, BullMQ job, gates, Full-Bench, assembly, and
 * derivatives land in later slices and will export from here.
 *
 * Integration point: import { runStore } from "@/workflows" for the run store,
 * and { getTemplate, listTemplates } for the template registry.
 */

export { InMemoryRunStore, VALID_TRANSITIONS, canTransition } from "./runStore";
export { SupabaseRunStore, rowToRun, runToRow } from "./supabaseRunStore";
export type { WorkflowRunRow } from "./supabaseRunStore";
export { runStore, createRunStore, isSupabaseConfigured } from "./factory";
export {
  getTemplate,
  listTemplates,
  validateTemplate,
  isValidTemplate,
  TEMPLATES,
} from "./templates/registry";
export type {
  WorkflowStep,
  WorkflowTemplate,
  Finding,
  FindingSeverity,
  RunStatus,
  WorkflowRun,
  RunInput,
  RunPatch,
  TransitionOptions,
  WorkflowRunStore,
} from "./types";
export type {
  LlmComplete,
  ModelForTier,
  BenchVerdict,
  BenchVerdictKind,
  FullBenchOptions,
  RunFullBench,
  ValidationResult,
  FidelityResult,
  AssembleDeliverable,
  ValidateDeliverable,
  VerifyFidelity,
  DerivativeType,
  Derivative,
} from "./contracts";
