/**
 * Per-provider embedding adapters.
 *
 * Each adapter exposes the SAME shape — `embed(texts, opts)` returning
 * `number[][]` — so the dispatcher (`./index.ts`) can swap them at runtime.
 *
 * - cohere : production path, multilingual + reranker support
 * - voyage : kept as a STUB until voyage-2-large is wired up. The current
 *            Louis codebase exposes Voyage in the api-keys catalog but
 *            doesn't yet have an HTTP client. We throw a clear error rather
 *            than silently embed-as-zeros.
 * - openai : same — stub for `text-embedding-3-large`.
 *
 * NB: voyage / openai stubs are intentional. The point of this scaffold is
 * to make Cohere the first real provider while keeping the switch-case in
 * the dispatcher honest about what is and isn't implemented.
 */

import * as cohere from "../providers/cohere";

export type EmbeddingProvider = "cohere" | "voyage" | "openai";

export interface EmbedCallOpts {
  /** Provider-specific model override. */
  model?: string;
  /** Whether these texts are documents (stored) or a query (one-shot). */
  inputType?: "search_document" | "search_query";
  /** Per-user BYO key (resolved by the caller from the api-keys store). */
  apiKey?: string;
}

export interface EmbeddingAdapter {
  embed(texts: string[], opts?: EmbedCallOpts): Promise<number[][]>;
  /** Native vector dimensionality — used when allocating zero-vectors / DB columns. */
  dimensions: number;
  /** Default model identifier (for logging + telemetry). */
  defaultModel: string;
}

// ---------------------------------------------------------------------------
// Cohere — multilingual v3 (1024-dim)
// ---------------------------------------------------------------------------

export const cohereAdapter: EmbeddingAdapter = {
  defaultModel: cohere.DEFAULT_EMBED_MODEL,
  dimensions: 1024,
  async embed(texts, opts = {}) {
    return cohere.embedTexts(texts, {
      model: opts.model,
      inputType: opts.inputType || "search_document",
      apiKey: opts.apiKey,
    });
  },
};

// ---------------------------------------------------------------------------
// Voyage — stub. Replace when voyage-2-large client is wired up.
// ---------------------------------------------------------------------------

export const voyageAdapter: EmbeddingAdapter = {
  defaultModel: "voyage-2-large",
  dimensions: 1536,
  async embed() {
    throw new Error(
      "Voyage embeddings adapter is not implemented yet. Switch EMBEDDINGS_PROVIDER to `cohere`, or contribute the Voyage client.",
    );
  },
};

// ---------------------------------------------------------------------------
// OpenAI — stub. Replace when text-embedding-3-large client is wired up.
// ---------------------------------------------------------------------------

export const openaiAdapter: EmbeddingAdapter = {
  defaultModel: "text-embedding-3-large",
  dimensions: 3072,
  async embed() {
    throw new Error(
      "OpenAI embeddings adapter is not implemented yet. Switch EMBEDDINGS_PROVIDER to `cohere`, or contribute the OpenAI embeddings client.",
    );
  },
};

export function getAdapter(provider: EmbeddingProvider): EmbeddingAdapter {
  switch (provider) {
    case "cohere":
      return cohereAdapter;
    case "voyage":
      return voyageAdapter;
    case "openai":
      return openaiAdapter;
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown embeddings provider: ${String(_exhaustive)}`);
    }
  }
}
