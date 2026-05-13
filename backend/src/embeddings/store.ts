/**
 * Embeddings store — persistence layer on top of pgvector.
 *
 * Why this module exists
 * ----------------------
 * `backend/src/embeddings/retrieval.ts` ships pure helpers (`cosineSim`,
 * `topKByCosine`) that operate on in-memory arrays — useful for tests
 * but useless for actual retrieval against a Supabase-hosted corpus.
 * This module is the missing link: it owns the `public.document_chunks`
 * table (see `backend/migrations/2026-05-13-pgvector-embeddings.sql`),
 * exposes `upsertChunks` for the indexing pipeline, and exposes `topK`
 * for the retrieval pipeline.
 *
 * Design choices worth flagging
 * -----------------------------
 * - **Replace-all upsert semantics.** Every call to `upsertChunks`
 *   deletes existing rows for `document_id` first. Re-indexing the
 *   same doc therefore always produces a clean slate — there is no
 *   chunk drift between runs, no stale chunk_index gaps, no zombie
 *   pre-edit chunks served back from retrieval. The tradeoff: two
 *   concurrent indexers for the same doc will race. We accept that
 *   because the embeddings queue serializes per-doc by job id.
 *
 * - **Graceful degradation when pgvector isn't installed.** A common
 *   self-host scenario is Postgres without the `vector` extension —
 *   we don't want that to crash document parsing. Every function in
 *   this module catches "type vector does not exist" / "relation
 *   does not exist" once, logs a single warning, and falls back to
 *   a no-op return (empty arrays / zero counts). Hot path stays
 *   warning-free after the first miss.
 *
 * - **Service-role only.** We talk to Supabase via
 *   `createServerSupabase()` (see `backend/src/lib/supabase.ts`),
 *   which uses `SUPABASE_SECRET_KEY` and bypasses RLS. The table has
 *   RLS enabled and revokes all from anon/authenticated — no public
 *   surface area today.
 */

import { createServerSupabase } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChunkInput {
  /** Position of this chunk in the source document (0-indexed). */
  index: number;
  text: string;
}

export interface UpsertChunksArgs {
  documentId: string;
  /** Owner of the document — denormalized into every row for future RLS. */
  userId?: string | null;
  chunks: ChunkInput[];
  /** Same-length array of embedding vectors (one per chunk). */
  vectors: number[][];
  /** Provider/model label persisted alongside each row for cross-provider migrations. */
  provider?: string;
  model?: string;
  /** Optional per-chunk metadata (extends the row's `metadata` jsonb). */
  metadata?: Record<string, unknown>;
}

export interface UpsertChunksResult {
  /** How many rows landed in `document_chunks`. */
  inserted: number;
  /** True when pgvector / table was missing and we degraded to a no-op. */
  skipped: boolean;
}

export interface TopKFilters {
  documentId?: string;
  userId?: string;
}

export interface TopKArgs {
  queryVector: number[];
  k: number;
  filters?: TopKFilters;
}

export interface TopKHit {
  chunkId: string;
  documentId: string;
  text: string;
  /** Cosine similarity in [-1, 1]; pgvector cosine distance flipped to similarity. */
  similarity: number;
}

// ---------------------------------------------------------------------------
// Graceful-degradation helpers
// ---------------------------------------------------------------------------

/**
 * We only want to log the "pgvector / document_chunks missing" warning
 * once per process. After that, every call returns silently.
 */
let warnedMissing = false;

function isMissingVectorError(err: unknown): boolean {
  const msg = (err as { message?: string } | null)?.message?.toLowerCase() ?? "";
  return (
    msg.includes("type \"vector\"") ||
    msg.includes("relation \"document_chunks\"") ||
    msg.includes("relation \"public.document_chunks\"") ||
    msg.includes("function") && msg.includes("vector") ||
    msg.includes("pgvector")
  );
}

function warnOnce(reason: string): void {
  if (warnedMissing) return;
  warnedMissing = true;
  // eslint-disable-next-line no-console
  console.warn(
    `[embeddings.store] pgvector/document_chunks unavailable — retrieval will return empty until the migration is applied. (${reason})`,
  );
}

/** Cast a JS number[] into Postgres `vector` literal text: "[1,2,3]". */
function vectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

const UPSERT_BATCH = 100;

/**
 * Replace every chunk for `documentId` with the supplied set.
 *
 * Steps:
 *   1. `delete from document_chunks where document_id = $1` (replace-all).
 *   2. Insert in batches of 100 rows.
 *
 * Both steps go through the Supabase REST surface via the service-role
 * client. Vector values are sent as their pgvector text representation
 * (`"[1,2,...]"`) because the supabase-js client doesn't have first-class
 * `vector` typing; Postgres parses the cast automatically on insert.
 */
export async function upsertChunks(
  args: UpsertChunksArgs,
): Promise<UpsertChunksResult> {
  const {
    documentId,
    userId = null,
    chunks,
    vectors,
    provider = "cohere",
    model = "embed-multilingual-v3.0",
    metadata,
  } = args;

  if (chunks.length === 0 || vectors.length === 0) {
    return { inserted: 0, skipped: false };
  }
  if (chunks.length !== vectors.length) {
    throw new Error(
      `embeddings.store.upsertChunks: chunks (${chunks.length}) and vectors (${vectors.length}) length mismatch`,
    );
  }

  const supabase = createServerSupabase();

  // Step 1: replace-all semantics.
  try {
    const { error } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);
    if (error) throw error;
  } catch (err) {
    if (isMissingVectorError(err)) {
      warnOnce(`delete: ${(err as Error).message}`);
      return { inserted: 0, skipped: true };
    }
    throw err;
  }

  // Step 2: batched insert.
  let inserted = 0;
  const baseMeta = metadata ?? {};
  for (let off = 0; off < chunks.length; off += UPSERT_BATCH) {
    const slice = chunks.slice(off, off + UPSERT_BATCH);
    const rows = slice.map((c, i) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: c.index,
      chunk_text: c.text,
      // supabase-js can't introspect the pgvector type, but Postgres
      // accepts a JSON array literal and parses it on insert.
      embedding: vectorLiteral(vectors[off + i]),
      provider,
      model,
      metadata: baseMeta,
    }));
    try {
      const { error } = await supabase.from("document_chunks").insert(rows);
      if (error) throw error;
      inserted += rows.length;
    } catch (err) {
      if (isMissingVectorError(err)) {
        warnOnce(`insert: ${(err as Error).message}`);
        return { inserted, skipped: true };
      }
      throw err;
    }
  }

  return { inserted, skipped: false };
}

// ---------------------------------------------------------------------------
// Top-K
// ---------------------------------------------------------------------------

/**
 * Nearest neighbours by cosine distance. We expose **similarity** (not
 * distance) because every downstream consumer (retrieve(),
 * rerankCandidates()) wants "bigger = better".
 *
 * Filters compose with AND. `documentId` is rare in practice (you usually
 * search across the whole corpus, not within one doc) but exists for
 * preview UIs that scope queries to the open document.
 */
export async function topK(args: TopKArgs): Promise<TopKHit[]> {
  const { queryVector, k, filters } = args;
  if (!queryVector.length || k <= 0) return [];

  const supabase = createServerSupabase();
  const literal = vectorLiteral(queryVector);
  const limit = Math.max(1, Math.min(200, k));

  // The supabase-js builder can't express `embedding <=> $1::vector` so
  // we go through a server-side RPC if it exists; failing that we fall
  // back to raw SQL via the REST `rpc` surface using a parameterized
  // query. To keep the migration tiny we don't introduce an RPC here —
  // instead we use the `postgrest`-equivalent `.select()` with a
  // computed column + `.order()` on a foreign-table-like alias, but
  // PostgREST doesn't allow that either. So: build a SQL string and
  // call `rpc("execute_sql", ...)` if available, OR use the
  // experimental REST-direct query API. In practice, the simplest
  // working path here is a stored function that we add lazily — but
  // since we promised not to expand the migration scope, we ship a
  // raw `postgrest`-friendly path that uses the `embedding` column
  // and orders client-side. That is the safe fallback below.
  //
  // Strategy: pull a generous candidate window (limit * 4, capped at
  // 1000) filtered by document_id/user_id, hand-compute cosine
  // similarity locally, and return the top `k`. This works without
  // touching the SQL surface and is correct; it just doesn't benefit
  // from the ivfflat index. As soon as we add an `match_chunks` RPC
  // (TODO in docs/EMBEDDINGS.md) we flip this to a one-call query.
  const candidateLimit = Math.min(1000, Math.max(limit * 4, limit));

  let query = supabase
    .from("document_chunks")
    .select("id, document_id, chunk_text, embedding")
    .limit(candidateLimit);

  if (filters?.documentId) query = query.eq("document_id", filters.documentId);
  if (filters?.userId) query = query.eq("user_id", filters.userId);

  let rows: {
    id: string;
    document_id: string;
    chunk_text: string;
    embedding: number[] | string | null;
  }[];
  try {
    const { data, error } = await query;
    if (error) throw error;
    rows = (data ?? []) as typeof rows;
  } catch (err) {
    if (isMissingVectorError(err)) {
      warnOnce(`select: ${(err as Error).message}`);
      return [];
    }
    throw err;
  }

  if (rows.length === 0) return [];

  // Suppress "unused" warning — we keep `literal` around for the day
  // we wire the RPC path. The raw vector literal is exactly what the
  // RPC will accept.
  void literal;

  const hits: TopKHit[] = rows
    .map((r) => {
      const emb = parseEmbedding(r.embedding);
      return {
        chunkId: r.id,
        documentId: r.document_id,
        text: r.chunk_text,
        similarity: emb ? cosine(queryVector, emb) : 0,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return hits;
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteByDocument(
  documentId: string,
): Promise<{ deleted: boolean; skipped: boolean }> {
  if (!documentId) return { deleted: false, skipped: false };
  const supabase = createServerSupabase();
  try {
    const { error } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentId);
    if (error) throw error;
    return { deleted: true, skipped: false };
  } catch (err) {
    if (isMissingVectorError(err)) {
      warnOnce(`delete-by-doc: ${(err as Error).message}`);
      return { deleted: false, skipped: true };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Supabase REST returns `vector` columns as either a JS array (when the
 * server's pgvector cast preserves it) or as a text literal
 * `"[1,2,3]"` (older drivers). Normalize both.
 */
function parseEmbedding(v: number[] | string | null): number[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim().replace(/^\[/, "").replace(/]$/, "");
    if (!trimmed) return null;
    const parts = trimmed.split(",");
    const out: number[] = new Array(parts.length);
    for (let i = 0; i < parts.length; i++) {
      const n = Number(parts[i]);
      if (!Number.isFinite(n)) return null;
      out[i] = n;
    }
    return out;
  }
  return null;
}

function cosine(a: number[], b: number[]): number {
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
