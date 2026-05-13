/**
 * Embeddings dispatcher — public surface for the rest of the backend.
 *
 * Why this module exists
 * ----------------------
 * Until now, embeddings have only existed as a *queue name* in Louis
 * (`backend/src/queue/index.ts` declares "embeddings" but nothing wires
 * a worker into it). This dispatcher fills the gap: a provider-pluggable
 * front door for `embed()` + a `retrieve()` helper that bolts the Cohere
 * rerank pass onto whatever vector search the caller already has.
 *
 * Provider selection
 * ------------------
 *   1. Explicit `config.provider` on the call wins.
 *   2. Else `process.env.EMBEDDINGS_PROVIDER` (one of "cohere" | "voyage" | "openai").
 *   3. Else "cohere" (HAQQ Legal AI is multilingual-first).
 *
 * Backwards compat
 * ----------------
 * `embed(texts)` with no opts continues to work — it picks the default
 * provider. Existing callers (currently none — the queue worker hasn't
 * shipped yet) don't have to be retrofitted.
 *
 * Rerank conditional
 * ------------------
 * `retrieve()` runs rerank when:
 *   - `config.rerank !== false` AND
 *   - Cohere is available (env key OR an explicit per-user key was passed).
 * Otherwise it returns the vector top-K as-is.
 */

import { getAdapter, type EmbeddingProvider, type EmbedCallOpts } from "./providers";
import {
  cosineSim,
  topKByCosine,
  rerankCandidates,
  type ScoredCandidate,
} from "./retrieval";
import { hasCohereEnvKey } from "../providers/cohere";

export { cosineSim, topKByCosine, rerankCandidates };
export type { ScoredCandidate, EmbeddingProvider };

// ---------------------------------------------------------------------------
// Provider config resolution
// ---------------------------------------------------------------------------

export interface EmbeddingsConfig {
  provider?: EmbeddingProvider;
  model?: string;
  /** Optional per-user BYO key, resolved by the caller. */
  apiKey?: string;
  /** Optional per-user BYO Cohere key for the rerank pass (often == apiKey when provider is cohere). */
  cohereApiKey?: string;
}

function resolveProvider(p?: EmbeddingProvider): EmbeddingProvider {
  if (p) return p;
  const env = process.env.EMBEDDINGS_PROVIDER?.toLowerCase().trim();
  if (env === "voyage" || env === "openai" || env === "cohere") return env;
  return "cohere";
}

// ---------------------------------------------------------------------------
// embed() — provider-pluggable vector generation
// ---------------------------------------------------------------------------

export interface EmbedOptions extends EmbeddingsConfig {
  /** Cohere needs to know if we're embedding queries vs documents. */
  inputType?: "search_document" | "search_query";
}

/**
 * Embed an array of texts. Defaults to documents — pass
 * `inputType: "search_query"` when embedding a query for v3 asymmetric
 * retrieval models (Cohere multilingual v3 in particular).
 */
export async function embed(
  texts: string[],
  options: EmbedOptions = {},
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const provider = resolveProvider(options.provider);
  const adapter = getAdapter(provider);
  const opts: EmbedCallOpts = {
    model: options.model,
    inputType: options.inputType,
    apiKey: options.apiKey,
  };
  return adapter.embed(texts, opts);
}

/** Embed a single text — sugar around `embed([text])`. */
export async function embedOne(text: string, options: EmbedOptions = {}): Promise<number[]> {
  const [v] = await embed([text], options);
  return v ?? [];
}

/** Embed a single query — convenience helper that flips `inputType`. */
export async function embedQuery(text: string, options: EmbedOptions = {}): Promise<number[]> {
  return embedOne(text, { ...options, inputType: "search_query" });
}

/** Inspect dimensionality / default model for the currently-selected provider. */
export function describeProvider(provider?: EmbeddingProvider): {
  provider: EmbeddingProvider;
  defaultModel: string;
  dimensions: number;
} {
  const p = resolveProvider(provider);
  const a = getAdapter(p);
  return { provider: p, defaultModel: a.defaultModel, dimensions: a.dimensions };
}

// ---------------------------------------------------------------------------
// retrieve() — vector top-K + optional Cohere rerank
// ---------------------------------------------------------------------------

export interface RetrieveOptions extends EmbeddingsConfig {
  /** Final result count after rerank. Default 10; clamped to [1, 50]. */
  topN?: number;
  /** Pre-rerank candidate pool size. Default = max(40, topN * 4). */
  preRerankK?: number;
  /**
   * Master switch. `undefined` = auto (rerank ON when Cohere key is reachable).
   * `true`  = force ON (will throw if no Cohere key).
   * `false` = force OFF (returns the raw vector top-K).
   */
  rerank?: boolean;
  /** Cohere rerank model override. */
  rerankModel?: string;
}

/**
 * Compose the retrieval pipeline given a query and the vector top-K
 * shortlist the caller already has.
 *
 * This intentionally does NOT do the SQL/pgvector hit itself — that lives
 * in the caller (matters / clauses / citations route). We only own the
 * "shortlist -> rerank -> trimmed final list" step so we can be reused
 * from every retrieval surface.
 */
export async function retrieve<M>(
  query: string,
  candidates: ScoredCandidate<M>[],
  options: RetrieveOptions = {},
): Promise<ScoredCandidate<M>[]> {
  const topN = Math.min(50, Math.max(1, options.topN ?? 10));
  const wantRerank = decideRerank(options);

  if (!wantRerank || candidates.length === 0) {
    return candidates.slice(0, topN);
  }

  return rerankCandidates(query, candidates, {
    topN,
    model: options.rerankModel,
    apiKey: options.cohereApiKey ?? options.apiKey,
  });
}

function decideRerank(options: RetrieveOptions): boolean {
  if (options.rerank === false) return false;
  if (options.rerank === true) return true;
  // Auto: ON when a Cohere key is reachable (env OR explicit per-user override).
  if (options.cohereApiKey?.trim()) return true;
  if (options.provider === "cohere" && options.apiKey?.trim()) return true;
  return hasCohereEnvKey();
}
