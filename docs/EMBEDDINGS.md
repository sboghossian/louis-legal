# Embeddings & Retrieval Pipeline

Louis is BYO-key. Retrieval is provider-pluggable behind a single dispatcher
at `backend/src/embeddings/`. The default path is **Cohere multilingual
embeddings + Cohere rerank** because HAQQ Legal AI runs across Arabic /
French / English legal text and v3 multilingual is the cheapest off-the-shelf
model that holds up.

## Pipeline

```
+-----------+    +--------------------+    +-------------------+
|  query    | -> | embed(query)        | -> | pgvector top-K    |
+-----------+    | input_type=search_  |    | (caller-owned SQL)|
                 | query               |    +-------------------+
                 +--------------------+              |
                                                     v
                                       +-----------------------------+
                                       | retrieve()                  |
                                       |  - takes ScoredCandidate[]  |
                                       |  - optionally Cohere rerank |
                                       |  - returns top-N (8-13)     |
                                       +-----------------------------+
```

- **Embed**: `embed(texts, { provider, model, apiKey, inputType })`
  - `provider` defaults to `EMBEDDINGS_PROVIDER` env, falling back to `cohere`.
  - For Cohere, always pass `inputType: "search_query"` when embedding the
    user query and `"search_document"` (default) for stored chunks — v3
    models are asymmetric.
- **Retrieve**: `retrieve(query, candidates, { topN, rerank, ... })`
  - `candidates` is whatever the caller's vector top-K returned.
  - `rerank` is auto by default: ON when a Cohere key is reachable
    (env `COHERE_API_KEY` or explicit per-user key), OFF otherwise.
  - Default `topN` is **10** (8–13 sweet spot for legal RAG context windows).

## Env vars

| Var                     | Required          | Default                    | Notes                                              |
| ----------------------- | ----------------- | -------------------------- | -------------------------------------------------- |
| `COHERE_API_KEY`        | when provider=cohere (and no per-user key) | —                          | BYO. The user's responsibility — Louis is free.    |
| `EMBEDDINGS_PROVIDER`   | no                | `cohere`                   | `cohere` \| `voyage` \| `openai`.                  |
| `VOYAGE_API_KEY`        | when provider=voyage | —                       | Voyage adapter is stub-only today.                 |
| `OPENAI_API_KEY`        | when provider=openai | —                       | OpenAI embeddings adapter is stub-only today.      |

## Models

| Provider | Default embed model         | Dim  | Default rerank model         |
| -------- | --------------------------- | ---- | ---------------------------- |
| cohere   | `embed-multilingual-v3.0`   | 1024 | `rerank-multilingual-v3.0`   |
| voyage   | `voyage-2-large` (stub)     | 1536 | n/a                          |
| openai   | `text-embedding-3-large` (stub) | 3072 | n/a                       |

## Decisions / defaults worth confirming

- **Rerank `topN` = 10**. The 8–13 band is the legal-RAG sweet spot
  (long-document chunks, ~700–1000 tokens each, fitting comfortably in any
  modern context). Tune in `RetrieveOptions.topN`.
- **Pre-rerank pool = max(40, topN * 4)**. Documented in `retrieve()`. We
  rely on the caller to bring at least that many vector hits in.
- **Rerank auto-ON when Cohere key present**. Free product, so we don't
  burn the user's Cohere quota silently — but if they configured Cohere
  at all, they get the better experience by default.

## Migrating an existing index when the provider changes

Vector spaces are **not** comparable across providers:

- voyage-2-large: 1536 dims, English-tuned
- text-embedding-3-large: 3072 dims
- embed-multilingual-v3.0: 1024 dims, multilingual

Switching `EMBEDDINGS_PROVIDER` requires re-embedding every stored chunk.

One-liner script stub (drop into `backend/scripts/reindex-embeddings.ts`
once the pgvector table lands):

```ts
// usage: tsx scripts/reindex-embeddings.ts --provider cohere --batch 96
import { embed } from "../src/embeddings";
// pseudo: for await (const batch of streamChunks(96)) {
//   const vectors = await embed(batch.map(c => c.text));
//   await updateVectors(batch, vectors); // writes back to documents_chunks.vector
// }
```

While reindexing, keep both columns (`vector_old`, `vector_new`) and flip
the active column with a single env toggle once the back-fill finishes.

## TODOs deferred out of scope

The following changes were intentionally **not** made in this pass — they
touch files outside the embeddings scope and need a follow-up PR.

- **Wire `Provider = "cohere"` into `backend/src/apiKeys/_store.ts`** —
  add `"cohere"` to the `Provider` union and a `COHERE_API_KEY` entry in
  the `envMap`. Today the api-keys store can persist a Cohere key only if
  this is patched.
- **Add a Cohere entry to `backend/src/routes/apiKeys.ts` PROVIDERS catalog**
  with description `"Multilingual embeddings + reranker for retrieval"`
  and signup URL `https://dashboard.cohere.com/`. Until then the frontend
  card is augmented locally (see the api-keys page) so users see the
  option, but `POST /api/api-keys` will 400 for `provider: "cohere"`.
- **Embeddings queue worker** (`backend/src/queue/worker.ts`) — the
  `"embeddings"` queue is declared but unprocessed. Hook it up so document
  uploads enqueue chunk embedding jobs that call `embed()` from this
  dispatcher.
- **pgvector table + SQL migration** — add `documents_chunks.embedding
  vector(1024)` with an HNSW or IVFFlat index. Today retrieval helpers
  exist but there's nothing to read.
- **Citation / clauses / matters routes** — once chunks exist, plug
  `retrieve()` into the search handlers. The dispatcher is provider-aware
  so callers don't need to know which model produced the stored vector.
