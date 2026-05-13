/**
 * Cohere SDK wrapper — multilingual embeddings + reranker.
 *
 * Why this file exists
 * --------------------
 * Louis is BYO-key. Cohere ships two retrieval primitives we care about:
 *
 *   1. `embed`  — `embed-multilingual-v3.0`: 1024-dim multilingual vectors
 *                  that hold up across legal-domain Arabic / French / English
 *                  text. This is the path that produces vectors we store.
 *   2. `rerank` — `rerank-multilingual-v3.0`: cross-encoder reranker that
 *                  re-scores a candidate list against the query. We run it
 *                  AFTER vector top-K to lift precision before the LLM sees
 *                  the snippets.
 *
 * Both calls run against `https://api.cohere.com/v1`. We import the SDK
 * lazily so a missing `cohere-ai` dependency doesn't crash the API process
 * — the call simply throws a descriptive error when first invoked.
 *
 * Key resolution order
 * --------------------
 *   1. opts.apiKey (explicit, per-request override — used for per-user BYO)
 *   2. process.env.COHERE_API_KEY
 *   3. throw with a setup hint
 */

export const DEFAULT_EMBED_MODEL = "embed-multilingual-v3.0";
export const DEFAULT_RERANK_MODEL = "rerank-multilingual-v3.0";

/** Document shape accepted by rerank — string OR `{text: string}`. */
export type RerankDocument = string | { text: string };

export interface RerankResultItem {
  /** Index into the original `documents` array. */
  index: number;
  /** The original document (echoed back for ergonomics). */
  document: RerankDocument;
  /** Cohere relevance score in [0, 1]. */
  relevanceScore: number;
}

export interface CohereEmbedOpts {
  model?: string;
  /** Cohere requires `input_type` for v3 models — defaults to "search_document". */
  inputType?: "search_document" | "search_query" | "classification" | "clustering";
  /** Optional per-call override — e.g. per-user BYO key from the api-keys store. */
  apiKey?: string;
}

export interface CohereRerankOpts {
  query: string;
  documents: RerankDocument[];
  topN?: number;
  model?: string;
  apiKey?: string;
}

interface CohereSdkClient {
  embed(input: {
    texts: string[];
    model: string;
    inputType?: string;
    input_type?: string;
  }): Promise<{
    embeddings?: number[][] | { float?: number[][] };
  }>;
  rerank(input: {
    query: string;
    documents: RerankDocument[];
    topN?: number;
    top_n?: number;
    model: string;
  }): Promise<{
    results: { index: number; relevanceScore?: number; relevance_score?: number }[];
  }>;
}

interface CohereSdkModule {
  CohereClient: new (init: { token: string }) => CohereSdkClient;
}

let _cached: { key: string; client: CohereSdkClient } | null = null;

function resolveKey(explicit?: string): string {
  const key = explicit?.trim() || process.env.COHERE_API_KEY?.trim();
  if (key) return key;
  throw new Error(
    "Cohere API key missing. Set COHERE_API_KEY in the environment or add a Cohere key in Settings -> API Keys (BYO key — Louis never sees Cohere usage on your behalf).",
  );
}

function loadClient(apiKey: string): CohereSdkClient {
  if (_cached && _cached.key === apiKey) return _cached.client;
  let mod: CohereSdkModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("cohere-ai") as CohereSdkModule;
  } catch (err) {
    throw new Error(
      `cohere-ai SDK is not installed. Run \`npm install cohere-ai\` in backend/. (${String(err)})`,
    );
  }
  const client = new mod.CohereClient({ token: apiKey });
  _cached = { key: apiKey, client };
  return client;
}

/**
 * Embed an array of texts with Cohere.
 *
 * Always uses `input_type: "search_document"` by default — vectors stored in
 * the DB are document-side. Use `inputType: "search_query"` when embedding
 * the query at retrieval time so v3 asymmetric retrieval works correctly.
 */
export async function embedTexts(
  texts: string[],
  opts: CohereEmbedOpts = {},
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const key = resolveKey(opts.apiKey);
  const client = loadClient(key);
  const model = opts.model || DEFAULT_EMBED_MODEL;
  const inputType = opts.inputType || "search_document";

  const res = await client.embed({
    texts,
    model,
    // Send both snake_case + camelCase to be defensive across SDK minor versions.
    inputType,
    input_type: inputType,
  });

  const raw = res.embeddings;
  if (Array.isArray(raw)) return raw as number[][];
  if (raw && Array.isArray(raw.float)) return raw.float;
  throw new Error("Cohere embed: unexpected response shape (no embeddings array)");
}

/**
 * Rerank a list of candidate documents against a query.
 *
 * Returns the documents re-sorted by relevance with scores. The caller is
 * expected to take `topN` — we forward it so Cohere can return only the
 * winners (cheaper bandwidth on long candidate lists).
 */
export async function rerank({
  query,
  documents,
  topN,
  model,
  apiKey,
}: CohereRerankOpts): Promise<RerankResultItem[]> {
  if (documents.length === 0) return [];
  const key = resolveKey(apiKey);
  const client = loadClient(key);
  const useModel = model || DEFAULT_RERANK_MODEL;

  const res = await client.rerank({
    query,
    documents,
    model: useModel,
    topN,
    top_n: topN,
  });

  return res.results.map((r) => ({
    index: r.index,
    document: documents[r.index],
    relevanceScore: r.relevanceScore ?? r.relevance_score ?? 0,
  }));
}

/** True when a Cohere key is reachable via env (per-user is checked separately). */
export function hasCohereEnvKey(): boolean {
  return !!process.env.COHERE_API_KEY?.trim();
}
