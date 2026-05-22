/**
 * Wave 3 — Hybrid local (Ollama) + frontier model triage.
 *
 * A PURE, deterministic routing function. No I/O. No network.
 * Designed to sit in front of every model-selection call so the planner
 * can cheaply redirect low-stakes work to the local Ollama instance without
 * touching any provider-specific code.
 *
 * Routing policy
 * ──────────────
 * "quick"    + localAvailable → LOCAL   (low-stakes, latency priority)
 * "quick"    + !localAvailable → FRONTIER (fallback — local down)
 * "standard" + localAvailable → LOCAL   (prefer free/fast when local is up)
 * "standard" + !localAvailable → FRONTIER
 * "thorough" + any            → FRONTIER (accuracy/capability priority, always)
 * forceFrontier = true        → FRONTIER regardless of the above
 *
 * Rationale: "thorough" implies legal reasoning, high-risk analysis, or
 * multi-document workflows where frontier capability is non-negotiable.
 * "quick" and "standard" are safe to serve locally (title generation,
 * classification hints, lightweight extractions).
 */

import type { Intensity, ModelTier } from "./effort";
import { INTENSITY_PROFILES } from "./effort";
import { modelForTier } from "./models";
import type { Provider } from "./types";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface ModelRoute {
  /** Where the request should be dispatched. */
  target: "local" | "frontier";
  /** Concrete model identifier to pass to the provider/Ollama. */
  model: string;
  /** Human-readable explanation of the routing decision (for logs/traces). */
  reason: string;
}

export interface TriageInput {
  intensity: Intensity;
  /** True when the Ollama endpoint is configured and presumed reachable. */
  localAvailable: boolean;
  /**
   * Hard-override: force the frontier path regardless of intensity or local
   * availability. Useful when the caller already knows local is degraded or
   * the task requires tools that only frontier providers implement.
   */
  forceFrontier?: boolean;
}

// ---------------------------------------------------------------------------
// Environment helpers (cheap, testable — no network)
// ---------------------------------------------------------------------------

/**
 * Default Ollama model used when `OLLAMA_MODEL` is not set.
 * `qwen2.5` is a strong general/coder model that ships in common Ollama
 * distributions and performs well on legal-adjacent text tasks.
 */
export const DEFAULT_OLLAMA_MODEL = "qwen2.5";

/**
 * Return the Ollama model id to use.
 *
 * Reads `process.env.OLLAMA_MODEL`. Falls back to `DEFAULT_OLLAMA_MODEL`
 * ("qwen2.5") when the env var is absent or empty.
 */
export function localModelId(): string {
  const envModel = process.env.OLLAMA_MODEL;
  return envModel && envModel.trim().length > 0
    ? envModel.trim()
    : DEFAULT_OLLAMA_MODEL;
}

/**
 * Return whether the local Ollama instance is configured.
 *
 * This is an env-gate only (`OLLAMA_URL` must be set and non-empty).
 * Actual TCP reachability probing is the lead's responsibility — keep this
 * function cheap so it is always safe to call in hot paths and test in unit
 * tests without any network.
 */
export function isLocalAvailable(): boolean {
  const url = process.env.OLLAMA_URL;
  return typeof url === "string" && url.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Routing decision
// ---------------------------------------------------------------------------

/**
 * Frontier provider used when routing off-local.
 *
 * Hardcoded to "gemini" because that is Louis's default main/mid provider
 * (see `DEFAULT_MAIN_MODEL` in models.ts). The lead may expose this as a
 * config knob in a future wave.
 */
const FRONTIER_PROVIDER: Provider = "gemini";

/**
 * Decide whether to route a request to the local Ollama instance or to a
 * frontier API provider.
 *
 * The function is pure: same inputs always produce the same output.
 * It delegates frontier model resolution to `modelForTier` so model lists
 * stay in a single authoritative place (models.ts).
 */
export function decideModelRoute(input: TriageInput): ModelRoute {
  const { intensity, localAvailable, forceFrontier = false } = input;

  // Hard override: caller insists on frontier.
  if (forceFrontier) {
    const tier: ModelTier = INTENSITY_PROFILES[intensity].modelTier;
    const model = modelForTier(tier, FRONTIER_PROVIDER);
    return {
      target: "frontier",
      model,
      reason: `forceFrontier=true; tier=${tier}; provider=${FRONTIER_PROVIDER}`,
    };
  }

  // "thorough" always goes to frontier — capability over cost.
  if (intensity === "thorough") {
    const model = modelForTier("main", FRONTIER_PROVIDER);
    return {
      target: "frontier",
      model,
      reason: `intensity=thorough requires frontier capability; provider=${FRONTIER_PROVIDER}`,
    };
  }

  // "quick" and "standard": prefer local when available.
  if (localAvailable) {
    const model = localModelId();
    return {
      target: "local",
      model,
      reason: `intensity=${intensity}; local Ollama available (OLLAMA_URL set); model=${model}`,
    };
  }

  // Local not available — fall back to frontier.
  const tier: ModelTier = INTENSITY_PROFILES[intensity].modelTier;
  const model = modelForTier(tier, FRONTIER_PROVIDER);
  return {
    target: "frontier",
    model,
    reason: `intensity=${intensity}; local unavailable (OLLAMA_URL unset); fallback tier=${tier}; provider=${FRONTIER_PROVIDER}`,
  };
}
