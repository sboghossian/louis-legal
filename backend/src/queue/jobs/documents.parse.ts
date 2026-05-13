/**
 * Job: documents.parse
 *
 * Async PDF/DOCX text + structure extraction. The synchronous path lives in
 * `routes/documents.ts` (around `extractStructureTree` and `countPdfPages`)
 * and is re-used here via dynamic import so we don't pull express types into
 * the worker bundle.
 *
 * Trigger: documents.ts after upload, instead of running pdfjs/mammoth
 * inline. The job is responsible for:
 *   1. Downloading the stored object (storage_path) into a buffer
 *   2. Extracting raw text (pdfjs-dist for PDF, mammoth for DOCX)
 *   3. Persisting the parsed text + outline back onto the document row
 *   4. Enqueuing `embeddings.index` for downstream vector indexing
 */

import { queues } from "../index";

export const JOB_NAME = "documents.parse";

export interface DocumentsParseJobData {
  userId: string;
  documentId: string;
  storagePath: string;
  fileType: "pdf" | "docx" | "doc";
  /** Original filename — used for downstream display only. */
  filename?: string;
}

export interface DocumentsParseResult {
  documentId: string;
  text: string;
  numPages: number | null;
  outline: unknown[] | null;
  embeddingsJobId?: string;
}

interface JobLike {
  data: DocumentsParseJobData;
  log?: (msg: string) => Promise<void> | void;
}

export async function handleDocumentsParse(
  job: JobLike,
): Promise<DocumentsParseResult> {
  const { documentId, storagePath, fileType, filename } = job.data;
  await job.log?.(`parsing document=${documentId} type=${fileType}`);

  // TODO: fetch the object from storage. The existing handler in
  // routes/documents.ts does this via `getObject(storagePath)` from
  // lib/storage. We avoid importing express-side code here; the storage
  // helper is framework-agnostic and safe to reuse:
  //
  //   const { getObject } = await import("../../lib/storage");
  //   const buf = await getObject(storagePath);
  //
  // Left as a TODO so this job can be unit-tested without S3 creds.
  const buf: ArrayBuffer = new ArrayBuffer(0);

  let text = "";
  let numPages: number | null = null;
  let outline: unknown[] | null = null;

  if (fileType === "pdf") {
    try {
      const pdfjsLib = (await import(
        "pdfjs-dist/legacy/build/pdf.mjs" as string
      )) as unknown as {
        getDocument: (opts: unknown) => {
          promise: Promise<{
            numPages: number;
            getPage: (n: number) => Promise<{
              getTextContent: () => Promise<{
                items: { str?: string }[];
              }>;
            }>;
            getOutline: () => Promise<{ title?: string }[]>;
          }>;
        };
      };
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) })
        .promise;
      numPages = pdf.numPages;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map((it) => it.str ?? "").join(" "));
      }
      text = pages.join("\n\n");
      const o = await pdf.getOutline();
      outline = o?.length ? o : null;
    } catch (e) {
      await job.log?.(`pdf parse failed: ${String(e)}`);
      throw e;
    }
  } else if (fileType === "docx" || fileType === "doc") {
    try {
      const mammoth = (await import("mammoth")) as unknown as {
        extractRawText: (input: {
          buffer: Buffer;
        }) => Promise<{ value: string }>;
      };
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
      text = result.value;
    } catch (e) {
      await job.log?.(`docx parse failed: ${String(e)}`);
      throw e;
    }
  }

  // TODO: persist `text` + `outline` to the document row via supabase / pg.
  // Left to the integration step so this job is self-contained.

  // Hand off to the embeddings indexer.
  const enq = await queues.embeddings.add(
    "embeddings.index",
    {
      documentId,
      filename,
      text,
      // chunking decided by the embeddings job
    },
    { priority: 20 },
  );

  return {
    documentId,
    text,
    numPages,
    outline,
    embeddingsJobId: enq.id,
  };
}
