/**
 * Job: embeddings.delete
 *
 * Cleanup hook for the document lifecycle. When a document is deleted
 * we drop its chunk rows from `public.document_chunks` so retrieval
 * stops surfacing ghost results. Today this is a one-statement wrapper
 * over `embeddings/store.ts::deleteByDocument`, but lives behind a
 * queue so that:
 *
 *   1. The delete is **retryable** if Supabase is momentarily down —
 *      BullMQ's default backoff (3 attempts, exponential) keeps the
 *      delete request alive without blocking the user-facing DELETE.
 *   2. The chunk-purge can fan out to other downstream stores (BM25
 *      index, citation cache, etc) as they land without changing the
 *      delete call sites.
 *
 * Trigger: `routes/documents.ts` (DELETE handler) should
 *   `queues.embeddings.add("embeddings.delete", { documentId }, ...)`
 * after the row is removed. Wiring that call site is intentionally a
 * follow-up — see docs/EMBEDDINGS.md.
 */

export const JOB_NAME = "embeddings.delete";

export interface EmbeddingsDeleteJobData {
  documentId: string;
}

export interface EmbeddingsDeleteResult {
  documentId: string;
  deleted: boolean;
  /** True when pgvector / document_chunks wasn't there to delete from. */
  skipped: boolean;
}

interface JobLike {
  data: EmbeddingsDeleteJobData;
  log?: (msg: string) => Promise<void> | void;
}

export async function handleEmbeddingsDelete(
  job: JobLike,
): Promise<EmbeddingsDeleteResult> {
  const { documentId } = job.data;
  await job.log?.(`deleting chunks for document=${documentId}`);

  if (!documentId) {
    return { documentId: "", deleted: false, skipped: false };
  }

  const { deleteByDocument } = await import("../../embeddings/store");
  const res = await deleteByDocument(documentId);
  await job.log?.(
    `chunks delete result: deleted=${res.deleted} skipped=${res.skipped}`,
  );
  return { documentId, deleted: res.deleted, skipped: res.skipped };
}
