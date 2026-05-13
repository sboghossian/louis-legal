/**
 * Retrieval helpers — vector search math + the Cohere rerank pass.
 *
 * The Louis codebase doesn't yet have a centralised retrieval module
 * (search for `cosineSim` / `topK` returns nothing under backend/src).
 * Rather than reach into route files we shouldn't be touching, we plant
 * the primitives here so future retrieval callers — RAG-style chat,
 * clause-library lookup, citation linker — share one implementation.
 */

import { rerank as cohereRerank, hasCohereEnvKey, type RerankDocument } from "../providers/cohere";
import { topK as storeTopK, type TopKFilters } from "./store";

/** A candidate document carrying its vector, text, and arbitrary metadata. */
export interface ScoredCandidate<M = Record<string, unknown>> {
  id: string;
  text: string;
  /** Cosine similarity from the vector search. */
  score: number;
  metadata?: M;
}

/** Standard cosine similarity between two equal-length vectors. */
export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * In-memory top-K by cosine similarity. Useful for tests + small libraries.
 * For the real DB-backed path, callers should use pgvector `<->` (or `<#>`).
 */
export function topKByCosine<M>(
  query: number[],
  items: { id: string; text: string; vector: number[]; metadata?: M }[],
  k: number,
): ScoredCandidate<M>[] {
  const scored = items.map((it) => ({
    id: it.id,
    text: it.text,
    score: cosineSim(query, it.vector),
    metadata: it.metadata,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(0, k));
}

export interface RerankPassOpts {
  /** Final result count after rerank. Default: 10 (sits in the 8-13 sweet spot). */
  topN?: number;
  /** Rerank model override. Defaults to `rerank-multilingual-v3.0`. */
  model?: string;
  /** Per-user BYO Cohere key. */
  apiKey?: string;
}

/**
 * Run the Cohere rerank pass over a candidate list.
 *
 * The function preserves the original `ScoredCandidate` payload — only the
 * order changes and the `score` field is replaced by Cohere's relevance
 * score (in [0, 1], where higher = more relevant).
 */
export async function rerankCandidates<M>(
  query: string,
  candidates: ScoredCandidate<M>[],
  opts: RerankPassOpts = {},
): Promise<ScoredCandidate<M>[]> {
  if (candidates.length === 0) return [];
  const topN = opts.topN ?? 10;
  const documents: RerankDocument[] = candidates.map((c) => c.text);

  const ranked = await cohereRerank({
    query,
    documents,
    topN,
    model: opts.model,
    apiKey: opts.apiKey,
  });

  return ranked.map((r) => ({
    ...candidates[r.index],
    score: r.relevanceScore,
  }));
}

// ---------------------------------------------------------------------------
// retrieve() — full DB-backed pipeline (embed → pgvector top-K → rerank)
// ---------------------------------------------------------------------------

export interface RetrieveOptions {
  /** Final result count after optional rerank. Default 10 (8-13 sweet spot). */
  k?: number;
  /** Filter candidate pool to a single document / owner. */
  filters?: TopKFilters;
  /**
   * Pre-rerank pool size. Default = max(40, k * 4) — the dispatcher's
   * documented heuristic for letting rerank pick winners.
   */
  preRerankK?: number;
  /**
   * `undefined` = auto (rerank ON when a Cohere key is reachable).
   * `true`  = force ON (caller must have a key).
   * `false` = force OFF (return raw vector top-K).
   */
  rerank?: boolean;
  /** Cohere rerank model override. */
  rerankModel?: string;
  /** Per-user BYO Cohere key — used for both embed + rerank. */
  cohereApiKey?: string;
}

/**
 * Full retrieval round-trip against the persisted pgvector index.
 *
 * Flow:
 *   1. Embed the query (Cohere multilingual v3 by default,
 *      `inputType: "search_query"` for asymmetric retrieval).
 *   2. Pull a generous candidate pool from `document_chunks` via the
 *      store's cosine top-K.
 *   3. Optionally re-rank with Cohere if a key is reachable.
 *   4. Trim to the final `k` (default 10).
 *
 * This is the function every retrieval surface (clauses, citations,
 * RAG chat) should call. Callers don't need to know which provider
 * produced the stored vectors — the persisted `provider` / `model`
 * columns are advisory only.
 */
export async function retrieve(
  query: string,
  options: RetrieveOptions = {},
): Promise<ScoredCandidate<{ documentId: string; chunkId: string }>[]> {
  const k = Math.max(1, Math.min(50, options.k ?? 10));
  const preRerankK = Math.max(k, options.preRerankK ?? Math.max(40, k * 4));

  // Lazy import to avoid the embeddings dispatcher pulling in providers
  // at module-load time (keeps the worker bundle small).
  const { embedQuery } = await import("./index");

  const queryVector = await embedQuery(query, {
    apiKey: options.cohereApiKey,
  }).catch(() => [] as number[]);

  if (queryVector.length === 0) return [];

  const hits = await storeTopK({
    queryVector,
    k: preRerankK,
    filters: options.filters,
  });
  if (hits.length === 0) return [];

  const candidates: ScoredCandidate<{ documentId: string; chunkId: string }>[] =
    hits.map((h) => ({
      id: h.chunkId,
      text: h.text,
      score: h.similarity,
      metadata: { documentId: h.documentId, chunkId: h.chunkId },
    }));

  const wantRerank = decideRerank(options);
  if (!wantRerank) return candidates.slice(0, k);

  return rerankCandidates(query, candidates, {
    topN: k,
    model: options.rerankModel,
    apiKey: options.cohereApiKey,
  });
}

function decideRerank(options: RetrieveOptions): boolean {
  if (options.rerank === false) return false;
  if (options.rerank === true) return true;
  if (options.cohereApiKey?.trim()) return true;
  return hasCohereEnvKey();
}
