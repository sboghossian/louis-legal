/**
 * Retrieval helpers — vector search math + the Cohere rerank pass.
 *
 * The Louis codebase doesn't yet have a centralised retrieval module
 * (search for `cosineSim` / `topK` returns nothing under backend/src).
 * Rather than reach into route files we shouldn't be touching, we plant
 * the primitives here so future retrieval callers — RAG-style chat,
 * clause-library lookup, citation linker — share one implementation.
 */

import { rerank as cohereRerank, type RerankDocument } from "../providers/cohere";

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
