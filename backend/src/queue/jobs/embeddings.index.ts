/**
 * Job: embeddings.index
 *
 * Chunk a document's parsed text, embed each chunk via the configured
 * provider (Cohere multilingual v3 by default), and upsert the vectors
 * into pgvector-backed `public.document_chunks`.
 *
 * Upstream: `documents.parse` enqueues this with `{ documentId, userId,
 * filename, text }`. Downstream: retrieval surfaces hit
 * `embeddings/retrieval.ts::retrieve()` which now reads from the same
 * table this job writes to.
 *
 * Failure modes:
 *   - No Cohere key reachable → embedding throws → caught, returns
 *     stub:true with embedded=0. Doc parse still succeeds.
 *   - pgvector / table missing → store layer returns skipped:true and
 *     logs once. Job returns stub:false (embeddings *were* computed),
 *     indexed=0 (nothing persisted).
 *   - Both succeed → stub:false, embedded == indexed == chunks.length.
 */

export const JOB_NAME = "embeddings.index";

export interface EmbeddingsIndexJobData {
  documentId: string;
  /**
   * Owner of the document — denormalized into every chunk row for
   * future RLS predicates. Optional because legacy callers (pre this
   * change) didn't supply it; documents.parse always does going
   * forward.
   */
  userId?: string;
  filename?: string;
  text: string;
  /** Optional override of chunk size in characters. */
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface EmbeddingsIndexResult {
  documentId: string;
  chunks: number;
  embedded: number;
  indexed: number;
  /** True when the embedding pass was a no-op (no Cohere key reachable). */
  stub: boolean;
}

interface JobLike {
  data: EmbeddingsIndexJobData;
  log?: (msg: string) => Promise<void> | void;
}

export async function handleEmbeddingsIndex(
  job: JobLike,
): Promise<EmbeddingsIndexResult> {
  const {
    documentId,
    userId,
    text,
    chunkSize = 1500,
    chunkOverlap = 200,
  } = job.data;
  await job.log?.(
    `indexing document=${documentId} textLen=${text.length} chunk=${chunkSize}/${chunkOverlap}`,
  );

  if (!text) {
    return { documentId, chunks: 0, embedded: 0, indexed: 0, stub: true };
  }

  // Naive char-based chunking; the real implementation should respect
  // sentence + paragraph boundaries and use the same tokenizer as the
  // embedding model.
  const chunkTexts: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
    chunkTexts.push(text.slice(i, i + chunkSize));
    if (i + chunkSize >= text.length) break;
  }
  const chunks = chunkTexts.map((t, i) => ({ index: i, text: t }));

  let embedded = 0;
  let indexed = 0;
  let stub = true;
  try {
    const { embedTexts } = await import("../../providers/cohere");
    const vectors = await embedTexts(chunkTexts, {
      model: "embed-multilingual-v3.0",
    });
    embedded = vectors.length;
    stub = false;

    // Persist to pgvector. The store gracefully degrades to a no-op
    // when the migration hasn't been applied yet, so this is safe to
    // call from day one.
    const { upsertChunks } = await import("../../embeddings/store");
    const upsert = await upsertChunks({
      documentId,
      userId: userId ?? null,
      chunks,
      vectors,
      provider: "cohere",
      model: "embed-multilingual-v3.0",
    });
    indexed = upsert.inserted;
    await job.log?.(
      `embedded ${embedded} chunks via cohere multilingual; indexed=${indexed}${upsert.skipped ? " (pgvector missing)" : ""}`,
    );
  } catch (e) {
    await job.log?.(
      `embeddings skipped — ${(e as Error).message ?? "no cohere key"}`,
    );
  }

  return {
    documentId,
    chunks: chunks.length,
    embedded,
    indexed,
    stub,
  };
}
