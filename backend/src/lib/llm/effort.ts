/**
 * Adaptive cost governor — intensity dial.
 *
 * Mirrors Lavern's `engagement.ts` intensity→effort/budget/team model
 * (Apache-2.0, AnttiHero/lavern @ v0.15.0), adapted to Louis. A cheap
 * classifier signal + message length pick an `Intensity`, which drives:
 *   - the Claude API `effort` control (thinking depth / token spend),
 *   - the adaptive skill budget (how many skills the router loads),
 *   - the recommended model tier (low / mid / main),
 *   - a per-turn budget multiplier.
 *
 * Louis ships three tiers (quick / standard / thorough). Lavern's fourth
 * "maximal" tier is intentionally omitted — see tasks/todo.md AC1.
 */

/** Claude API effort levels — controls thinking depth and token spend. */
export type Effort = "low" | "medium" | "high" | "max";

/** Request intensity tier. */
export type Intensity = "quick" | "standard" | "thorough";

/** Model tier the intensity recommends (maps to models.ts tier arrays). */
export type ModelTier = "low" | "mid" | "main";

export interface IntensityProfile {
  effort: Effort;
  /** Max number of skills the router may load at this intensity. */
  skillBudget: number;
  modelTier: ModelTier;
  /** Per-turn budget multiplier relative to the standard ceiling (1.0). */
  budgetMultiplier: number;
}

/**
 * Profiles per intensity. `skillBudget` rises monotonically (quick < standard
 * < thorough) and never exceeds the previous hard cap of 13 used by the router.
 */
export const INTENSITY_PROFILES: Record<Intensity, IntensityProfile> = {
  quick:    { effort: "low",    skillBudget: 5,  modelTier: "low",  budgetMultiplier: 0.3 },
  standard: { effort: "medium", skillBudget: 9,  modelTier: "mid",  budgetMultiplier: 1.0 },
  thorough: { effort: "high",   skillBudget: 13, modelTier: "main", budgetMultiplier: 2.0 },
};

/** Ordered tiers, cheapest → most expensive. */
const ORDER: readonly Intensity[] = ["quick", "standard", "thorough"];

export interface IntensitySignals {
  /** Word count of the user message. */
  messageWords: number;
  /** Classifier complexity hint, if any (e.g. "low" | "medium" | "high"). */
  complexity?: string;
  /** Classifier risk hint, if any (e.g. "low" | "medium" | "high"). */
  riskLevel?: string;
  /** Classifier confidence (0..1). */
  confidence?: number;
}

const QUICK_MAX_WORDS = 12;
const THOROUGH_MIN_WORDS = 80;

function isHigh(v?: string): boolean {
  return typeof v === "string" && /^(high|critical|severe)$/i.test(v.trim());
}

function isLow(v?: string): boolean {
  return typeof v === "string" && /^(low|trivial|minimal)$/i.test(v.trim());
}

/**
 * Pick the base intensity from request signals.
 *
 * - Short message + low (or absent) complexity/risk → quick.
 * - Long message, or high complexity, or high risk → thorough.
 * - Everything else → standard.
 *
 * Confidence does NOT shift the base tier here — low confidence is handled by
 * `escalate()` so the two effects compose predictably.
 */
export function pickIntensity(signals: IntensitySignals): Intensity {
  const words = Math.max(0, signals.messageWords);

  if (isHigh(signals.complexity) || isHigh(signals.riskLevel)) return "thorough";
  if (words >= THOROUGH_MIN_WORDS) return "thorough";

  const simple = isLow(signals.complexity) || signals.complexity === undefined;
  const lowRisk = isLow(signals.riskLevel) || signals.riskLevel === undefined;
  if (words <= QUICK_MAX_WORDS && simple && lowRisk) return "quick";

  return "standard";
}

/**
 * Bump one tier up when classifier confidence is low or risk is high.
 * Caps at `thorough`. Idempotent at the ceiling.
 */
export function escalate(
  intensity: Intensity,
  signals: { confidence?: number; riskLevel?: string },
): Intensity {
  const lowConfidence = typeof signals.confidence === "number" && signals.confidence < 0.55;
  const highRisk = isHigh(signals.riskLevel);
  if (!lowConfidence && !highRisk) return intensity;
  const idx = ORDER.indexOf(intensity);
  return ORDER[Math.min(idx + 1, ORDER.length - 1)];
}

/** Convenience: profile for an intensity. */
export function profileFor(intensity: Intensity): IntensityProfile {
  return INTENSITY_PROFILES[intensity];
}
