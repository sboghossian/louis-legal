/**
 * Per-turn budget governor.
 *
 * Estimates the USD cost of a single LLM turn from rough per-model token rates,
 * and flags turns that would exceed a configurable ceiling. Deterministic, no
 * network, no LLM — a cheap guard the router/chat handler can call before
 * spending on the expensive frontier call.
 *
 * Rates are coarse public list prices (USD per 1M tokens) as of 2026-05; they
 * are deliberately conservative and meant for relative budgeting, not billing.
 */

interface Rate {
  /** USD per 1M input tokens. */
  inUsdPerM: number;
  /** USD per 1M output tokens. */
  outUsdPerM: number;
}

/** Per-model rates. Unknown models fall back to a mid-tier estimate. */
const MODEL_RATES: Record<string, Rate> = {
  // Claude
  "claude-opus-4-7":      { inUsdPerM: 15, outUsdPerM: 75 },
  "claude-sonnet-4-6":    { inUsdPerM: 3,  outUsdPerM: 15 },
  "claude-sonnet-4-5":    { inUsdPerM: 3,  outUsdPerM: 15 },
  "claude-haiku-4-5":     { inUsdPerM: 1,  outUsdPerM: 5 },
  // Gemini
  "gemini-3.1-pro-preview":        { inUsdPerM: 2.5, outUsdPerM: 15 },
  "gemini-3-flash-preview":        { inUsdPerM: 0.3, outUsdPerM: 2.5 },
  "gemini-3.1-flash-lite-preview": { inUsdPerM: 0.1, outUsdPerM: 0.4 },
  // OpenAI
  "gpt-5.5":      { inUsdPerM: 5,   outUsdPerM: 20 },
  "gpt-5.4-mini": { inUsdPerM: 0.6, outUsdPerM: 2.4 },
  "gpt-5.4-nano": { inUsdPerM: 0.1, outUsdPerM: 0.4 },
};

/** Fallback when a model id has no explicit rate. Mid-tier, conservative. */
const FALLBACK_RATE: Rate = { inUsdPerM: 3, outUsdPerM: 15 };

const DEFAULT_CEILING_USD = 1.0;

export function rateForModel(model: string): Rate {
  return MODEL_RATES[model] ?? FALLBACK_RATE;
}

export interface TurnCostInput {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** Estimate the USD cost of a single turn. */
export function estimateTurnCostUsd(input: TurnCostInput): number {
  const rate = rateForModel(input.model);
  const inTok = Math.max(0, input.inputTokens);
  const outTok = Math.max(0, input.outputTokens);
  return (inTok / 1_000_000) * rate.inUsdPerM + (outTok / 1_000_000) * rate.outUsdPerM;
}

/**
 * The configured per-turn ceiling in USD.
 * Env: `LOUIS_TURN_BUDGET_USD` (defaults to {@link DEFAULT_CEILING_USD}).
 */
export function turnBudgetCeilingUsd(): number {
  const raw = process.env.LOUIS_TURN_BUDGET_USD;
  if (!raw) return DEFAULT_CEILING_USD;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CEILING_USD;
}

/** True when the estimate is at or under the ceiling. */
export function withinBudget(estUsd: number, ceilingUsd: number = turnBudgetCeilingUsd()): boolean {
  return estUsd <= ceilingUsd;
}

export interface TurnBudgetDecision {
  estUsd: number;
  ceilingUsd: number;
  withinBudget: boolean;
}

/**
 * Compose the estimate + ceiling + verdict for one turn — the single call the
 * chat handler uses to decide whether to emit a budget alert. Pure; never
 * blocks the turn itself (decision #87: alert, not block).
 */
export function decideTurnBudget(input: TurnCostInput): TurnBudgetDecision {
  const estUsd = estimateTurnCostUsd(input);
  const ceilingUsd = turnBudgetCeilingUsd();
  return { estUsd, ceilingUsd, withinBudget: withinBudget(estUsd, ceilingUsd) };
}
