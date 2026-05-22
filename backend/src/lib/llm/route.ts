/**
 * Opt-in cost/latency-routed completion (Wave 4 — makes Wave 3 triage + the
 * Ollama adapter usable together). Low-stakes turns go to a local Ollama model,
 * high-stakes to frontier, decided by {@link decideModelRoute}.
 *
 * ADDITIVE: the default chat path stays on `completeText`. Callers OPT IN by
 * calling this. If a local model is chosen but the call fails, it falls back to
 * frontier so a degraded Ollama never breaks the turn.
 */
import { completeText } from "./index";
import { completeOllamaText, pingOllama } from "./ollama";
import { decideModelRoute, type ModelRoute } from "./triage";
import type { Intensity } from "./effort";

export interface RoutedCompleteParams {
  intensity: Intensity;
  systemPrompt?: string;
  user: string;
  maxTokens?: number;
  /** Network reachability probe for Ollama. Default: env-gate (`OLLAMA_URL`) only. */
  probe?: boolean;
}

export interface RoutedCompleteResult {
  text: string;
  route: ModelRoute;
}

/** Whether the local model is available — a network ping when `probe`, else env-gate. */
export async function localAvailability(probe = false): Promise<boolean> {
  if (probe) return pingOllama();
  return Boolean(process.env.OLLAMA_URL);
}

/** Complete text via triage, with frontier fallback on local failure. */
export async function completeRouted(params: RoutedCompleteParams): Promise<RoutedCompleteResult> {
  const localAvailable = await localAvailability(params.probe);
  const route = decideModelRoute({ intensity: params.intensity, localAvailable });

  if (route.target === "local") {
    try {
      const text = await completeOllamaText({
        model: route.model,
        systemPrompt: params.systemPrompt,
        user: params.user,
        maxTokens: params.maxTokens,
      });
      return { text, route };
    } catch {
      // local unreachable / failed → fall through to frontier
    }
  }

  const frontier =
    route.target === "frontier"
      ? route
      : decideModelRoute({ intensity: params.intensity, localAvailable: false });
  const text = await completeText({
    model: frontier.model,
    systemPrompt: params.systemPrompt,
    user: params.user,
    maxTokens: params.maxTokens,
  });
  return { text, route: frontier };
}
