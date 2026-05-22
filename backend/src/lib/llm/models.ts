import type { Provider } from "./types";

// ---------------------------------------------------------------------------
// Canonical model IDs
// ---------------------------------------------------------------------------
// Main-chat tier (top-end) — user picks one of these per message.
export const CLAUDE_MAIN_MODELS = ["claude-opus-4-7", "claude-sonnet-4-6"] as const;
export const GEMINI_MAIN_MODELS = [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
] as const;
export const OPENAI_MAIN_MODELS = ["gpt-5.5", "gpt-5.4-mini"] as const;

// Mid-tier (used for tabular review) — user picks one in account settings.
export const CLAUDE_MID_MODELS = ["claude-sonnet-4-6"] as const;
export const GEMINI_MID_MODELS = ["gemini-3-flash-preview"] as const;
export const OPENAI_MID_MODELS = ["gpt-5.4-mini"] as const;

// Low-tier (used for title generation, lightweight extractions) — user picks
// one in account settings.
export const CLAUDE_LOW_MODELS = ["claude-haiku-4-5"] as const;
export const GEMINI_LOW_MODELS = ["gemini-3.1-flash-lite-preview"] as const;
export const OPENAI_LOW_MODELS = ["gpt-5.4-nano"] as const;

export const DEFAULT_MAIN_MODEL = "gemini-3-flash-preview";
export const DEFAULT_TITLE_MODEL = "gemini-3.1-flash-lite-preview";
export const DEFAULT_TABULAR_MODEL = "gemini-3-flash-preview";

const ALL_MODELS = new Set<string>([
    ...CLAUDE_MAIN_MODELS,
    ...GEMINI_MAIN_MODELS,
    ...OPENAI_MAIN_MODELS,
    ...CLAUDE_MID_MODELS,
    ...GEMINI_MID_MODELS,
    ...OPENAI_MID_MODELS,
    ...CLAUDE_LOW_MODELS,
    ...GEMINI_LOW_MODELS,
    ...OPENAI_LOW_MODELS,
]);

// ---------------------------------------------------------------------------
// Provider inference
// ---------------------------------------------------------------------------

export function providerForModel(model: string): Provider {
    if (model.startsWith("claude")) return "claude";
    if (model.startsWith("gemini")) return "gemini";
    if (model.startsWith("gpt-")) return "openai";
    throw new Error(`Unknown model id: ${model}`);
}

export function resolveModel(id: string | null | undefined, fallback: string): string {
    if (id && ALL_MODELS.has(id)) return id;
    return fallback;
}

// ---------------------------------------------------------------------------
// Tiering — map an intensity model tier to a concrete model id per provider
// ---------------------------------------------------------------------------

const TIER_MODELS: Record<Provider, Record<"low" | "mid" | "main", readonly string[]>> = {
    claude: { low: CLAUDE_LOW_MODELS, mid: CLAUDE_MID_MODELS, main: CLAUDE_MAIN_MODELS },
    gemini: { low: GEMINI_LOW_MODELS, mid: GEMINI_MID_MODELS, main: GEMINI_MAIN_MODELS },
    openai: { low: OPENAI_LOW_MODELS, mid: OPENAI_MID_MODELS, main: OPENAI_MAIN_MODELS },
};

/**
 * Resolve a tier (`low` | `mid` | `main`) to a concrete model id for the given
 * provider. Returns the first (canonical) model in that provider's tier array.
 * Used by the adaptive router to pick a model from an intensity's tier when the
 * classifier didn't already nominate one.
 */
export function modelForTier(tier: "low" | "mid" | "main", provider: Provider): string {
    return TIER_MODELS[provider][tier][0];
}
