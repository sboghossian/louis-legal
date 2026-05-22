/**
 * Cross-module integration seam for Wave 2 (defined up front so the orchestrator
 * spine and the parallel core slices — Full-Bench, assembly, derivatives —
 * compile against identical types and merge without adapters).
 *
 * Only the SHARED signatures live here. Each slice owns its internal types; what
 * it must agree on with the rest of the system is exactly what this file pins:
 *   - {@link LlmComplete}      the injected text-completion seam (all slices)
 *   - {@link RunFullBench}     2c output contract
 *   - assembly contracts       2d output contracts
 *   - {@link Derivative}       2e registry entry shape
 *
 * No LLM, no network, no app imports beyond {@link Finding}/{@link WorkflowRun}.
 */

import type { Finding, WorkflowRun, WorkflowStep } from "./types";

/**
 * Provider-agnostic text completion, injected for testability. A narrow subset
 * of `lib/llm` `completeText` — the orchestrator wires the real one (closing
 * over the user's API keys); tests pass a fake. Cores never import a provider.
 */
export type LlmComplete = (params: {
  model: string;
  systemPrompt?: string;
  user: string;
  maxTokens?: number;
}) => Promise<string>;

/** Map a step's declared tier to a concrete model id (wired to `modelForTier`). */
export type ModelForTier = (tier: WorkflowStep["modelTier"]) => string;

// ---------------------------------------------------------------------------
// Slice 2c — Full-Bench (bounded adversarial verify of RED findings)
// ---------------------------------------------------------------------------

export type BenchVerdictKind = "upheld" | "revised" | "withdrawn";

/** Verdict on one RED finding after Challenger → Defender → Evaluator. */
export interface BenchVerdict {
  findingId: string;
  verdict: BenchVerdictKind;
  /** Evaluator confidence, inclusive [0, 1]. */
  confidence: number;
  rationale: string;
  /** Replacement finding text when `verdict === "revised"`. */
  revised?: string;
}

export interface FullBenchOptions {
  /** Max findings to bench per run (default 3). */
  cap?: number;
}

/**
 * Run the bounded adversarial bench over RED findings only (non-RED are skipped
 * by the caller). Returns one verdict per benched finding, capped at
 * `opts.cap`.
 */
export type RunFullBench = (
  redFindings: Finding[],
  llm: LlmComplete,
  opts?: FullBenchOptions,
) => Promise<BenchVerdict[]>;

// ---------------------------------------------------------------------------
// Slice 2d — Assembly / validation / fidelity (final orchestrator phase)
// ---------------------------------------------------------------------------

/** Result of {@link ValidateDeliverable}: structural acceptability of a doc. */
export interface ValidationResult {
  ok: boolean;
  /** Why the doc was rejected (skeleton / placeholder / process-dump / thin). */
  problems: string[];
}

/** Result of {@link VerifyFidelity}: did the deliverable cover the findings. */
export interface FidelityResult {
  ok: boolean;
  redTotal: number;
  redCovered: number;
  /** Titles of RED findings not represented in the deliverable. */
  missing: string[];
}

/** Assemble the final deliverable from a completed run. */
export type AssembleDeliverable = (run: WorkflowRun, llm: LlmComplete) => Promise<string>;

/** Mechanical reject of skeleton / placeholder / process-dump / thin output. */
export type ValidateDeliverable = (doc: string) => ValidationResult;

/** Mechanical RED-coverage check + optional cheap LLM spot-check. */
export type VerifyFidelity = (
  run: WorkflowRun,
  doc: string,
  llm?: LlmComplete,
) => Promise<FidelityResult>;

// ---------------------------------------------------------------------------
// Slice 2e — Derivatives (typed registry of run-to-document transforms)
// ---------------------------------------------------------------------------

export type DerivativeType = "client-letter" | "summary" | "redline" | "memo";

/** One derivative: a prompt + a context-builder over a completed run. */
export interface Derivative {
  type: DerivativeType;
  title: string;
  /** Build the LLM call from a completed run (shape matches {@link LlmComplete}). */
  buildContext: (run: WorkflowRun) => { systemPrompt: string; user: string; maxTokens?: number };
}
