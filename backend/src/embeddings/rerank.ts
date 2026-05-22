/**
 * Wave 3 — Cohere rerank over retrieved chunks.
 *
 * Design
 * ------
 * This module is the thin public seam between the retrieval pipeline and
 * the Cohere reranker. It intentionally does NOT import `./retrieval.ts`
 * to avoid circular deps; `ScoredCandidate` lives in retrieval.ts while
 * `RerankCandidate` here is the minimal shape needed by the rerank call.
 *
 * Two call paths:
 *   1. Configured   — COHERE_API_KEY is present (or opts.client is injected).
 *                     Candidates are reordered by Cohere relevance score and
 *                     truncated to topN.
 *   2. Not configured — opts.client absent AND no env key. Returns the first
 *                       topN candidates in identity order with score = 0.
 *                       Never throws. Graceful degradation for BYO-key users
 *                       who haven't added a Cohere key yet.
 *
 * Wiring note for retrieval.ts
 * ----------------------------
 * After `topKByCosine` / `storeTopK` returns a shortlist, call:
 *
 *   import { rerank, isRerankConfigured } from "./rerank";
 *   const finalChunks = await rerank(query, shortlist, { topN: k });
 *
 * Pass those chunks — in their new order — to the LLM context builder.
 *
 * Injectable seam
 * ---------------
 * `RerankClient` is a typed override so tests never touch the network.
 * The default client (defaultCohereClient) uses the same fetch/auth style
 * as `backend/src/providers/cohere.ts`.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RerankCandidate {
  id: string;
  text: string;
}

export interface RerankResult {
  id: string;
  text: string;
  /** Cohere relevance score in [0, 1]. 0 in fallback (identity) mode. */
  score: number;
}

/**
 * Injectable seam — a function that calls a rerank endpoint and returns
 * the ranked indices + scores. Tests inject a mock here; production uses
 * `defaultCohereClient`.
 */
export type RerankClient = (
  query: string,
  docs: string[],
  topN: number,
) => Promise<{ index: number; relevanceScore: number }[]>;

// ---------------------------------------------------------------------------
// Configuration check
// ---------------------------------------------------------------------------

/** True when COHERE_API_KEY is present in the environment. */
export function isRerankConfigured(): boolean {
  return !!process.env.COHERE_API_KEY?.trim();
}

// ---------------------------------------------------------------------------
// Default Cohere client (same fetch/auth style as providers/cohere.ts)
// ---------------------------------------------------------------------------

interface CohereRerankApiResult {
  index: number;
  relevance_score?: number;
  relevanceScore?: number;
}

interface CohereRerankApiResponse {
  results: CohereRerankApiResult[];
}

const COHERE_RERANK_URL = "https://api.cohere.com/v1/rerank";
const DEFAULT_RERANK_MODEL = "rerank-multilingual-v3.0";

async function defaultCohereClient(
  query: string,
  docs: string[],
  topN: number,
): Promise<{ index: number; relevanceScore: number }[]> {
  const apiKey = process.env.COHERE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Cohere API key missing. Set COHERE_API_KEY or pass opts.client to bypass.",
    );
  }

  const body = JSON.stringify({
    query,
    documents: docs,
    top_n: topN,
    model: DEFAULT_RERANK_MODEL,
    return_documents: false,
  });

  const res = await fetch(COHERE_RERANK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Cohere rerank HTTP ${res.status}: ${text}`);
  }

  const data = (await res.json()) as CohereRerankApiResponse;

  return (data.results ?? []).map((r) => ({
    index: r.index,
    relevanceScore: r.relevanceScore ?? r.relevance_score ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Core rerank()
// ---------------------------------------------------------------------------

export interface RerankOpts {
  /** How many results to return. Defaults to min(candidates.length, 10). */
  topN?: number;
  /**
   * Injectable client — supply in tests so no real HTTP calls are made.
   * When omitted, falls back to `defaultCohereClient` when configured, or
   * identity order when not configured.
   */
  client?: RerankClient;
}

/**
 * Rerank `candidates` against `query`.
 *
 * - With a key (or injected client): calls the reranker, returns candidates
 *   in descending relevance order, trimmed to `topN`.
 * - Without a key and no client: identity fallback — first `topN` candidates,
 *   each with `score: 0`. Never throws.
 */
export async function rerank(
  query: string,
  candidates: RerankCandidate[],
  opts: RerankOpts = {},
): Promise<RerankResult[]> {
  const topN = Math.max(1, opts.topN ?? Math.min(candidates.length, 10));

  if (candidates.length === 0) return [];

  const client: RerankClient | null = opts.client ?? (isRerankConfigured() ? defaultCohereClient : null);

  // --- Graceful fallback: no client available ---
  if (client === null) {
    return candidates.slice(0, topN).map((c) => ({ ...c, score: 0 }));
  }

  // --- Rerank path ---
  const docs = candidates.map((c) => c.text);
  const effectiveTopN = Math.min(topN, candidates.length);

  const ranked = await client(query, docs, effectiveTopN);

  return ranked.map((r) => ({
    id: candidates[r.index].id,
    text: candidates[r.index].text,
    score: r.relevanceScore,
  }));
}
