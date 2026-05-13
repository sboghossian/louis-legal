/**
 * Job: embeddings.index
 *
 * Chunk a document's parsed text, embed each chunk, and write the vectors
 * into the matter-scoped index.
 *
 * Status: stub. The real implementation lands when Cohere multilingual is
 * integrated for HAQQ Legal AI's Arabic/French/English corpus. For now we
 * record the requested work so the upstream documents.parse job can chain
 * cleanly and the queue dashboard shows real job lineage.
 */

export const JOB_NAME = "embeddings.index";

export interface EmbeddingsIndexJobData {
  documentId: string;
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
  /** True while the embedding integration is pending. */
  stub: boolean;
}

interface JobLike {
  data: EmbeddingsIndexJobData;
  log?: (msg: string) => Promise<void> | void;
}

export async function handleEmbeddingsIndex(
  job: JobLike,
): Promise<EmbeddingsIndexResult> {
  const { documentId, text, chunkSize = 1500, chunkOverlap = 200 } = job.data;
  await job.log?.(
    `indexing document=${documentId} textLen=${text.length} chunk=${chunkSize}/${chunkOverlap}`,
  );

  if (!text) {
    return { documentId, chunks: 0, embedded: 0, indexed: 0, stub: true };
  }

  // Naive char-based chunking; the real implementation should respect
  // sentence + paragraph boundaries and use the same tokenizer as the
  // embedding model.
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
    chunks.push(text.slice(i, i + chunkSize));
    if (i + chunkSize >= text.length) break;
  }

  // Call Cohere multilingual embeddings if a key is reachable. We
  // dynamic-import to keep the worker boot fast and to let the SDK be
  // optional (no install → graceful no-op).
  let embedded = 0;
  let stub = true;
  try {
    const { embedTexts } = await import("../../providers/cohere");
    const vectors = await embedTexts(chunks, {
      model: "embed-multilingual-v3.0",
    });
    embedded = vectors.length;
    stub = false;
    // Vector persistence still pending — pgvector table + upsert lands
    // with the embeddings BullMQ worker integration. For now the
    // embeddings stream is computed; downstream retrieval will start
    // returning real results once `vectorIndex.upsert` exists.
    // TODO(embeddings.persistence)
    await job.log?.(
      `embedded ${embedded} chunks via cohere multilingual; persistence pending`,
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
    indexed: 0,
    stub,
  };
}
