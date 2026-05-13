-- 2026-05-13: pgvector-backed embeddings persistence
--
-- Until now the embeddings pipeline (see backend/src/embeddings/ +
-- backend/src/queue/jobs/embeddings.index.ts) computed Cohere
-- multilingual vectors but had nowhere to put them — the
-- `documents_chunks` table referenced in docs/EMBEDDINGS.md only
-- existed as a TODO. This migration installs the `vector` extension
-- (Supabase Cloud and self-hosted Postgres both ship it) and creates a
-- `document_chunks` table that the embeddings job upserts into and the
-- retrieval helper (`backend/src/embeddings/retrieval.ts::retrieve`)
-- reads from.
--
-- We size the embedding column to **1024 dims** — Cohere's
-- `embed-multilingual-v3.0` (HAQQ Legal AI's default for Arabic /
-- French / English) is 1024-dim. Switching to a different provider
-- (Voyage = 1536, OpenAI v3 large = 3072) will require a re-embed pass
-- and a column type change. See "Migrating an existing index" in
-- docs/EMBEDDINGS.md for the dual-column strategy we'll use when that
-- day comes.
--
-- IVFFlat with `lists = 100` is the recommended default for the
-- 10K-100K row range pgvector targets out of the box. We expect a
-- legal corpus of a few thousand documents × tens of chunks each to
-- live comfortably in this range. After the first big backfill, run
--   ANALYZE public.document_chunks;
-- so the planner picks up real statistics; without ANALYZE the IVFFlat
-- recall drops measurably.
--
-- Apply once: Supabase → SQL editor → paste → Run. (Or via
-- `npm run migrate`, which reads from public._migrations.)

-- ---------------------------------------------------------------------------
-- Extension
-- ---------------------------------------------------------------------------
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- document_chunks
-- ---------------------------------------------------------------------------
-- NOTE: `document_id` intentionally has NO FK to public.documents. The
-- existing `documents` table lives in `public` today, but historically
-- the chunks store has been designed to outlive a single tenant schema
-- (self-hosters often shard documents by org_id schema), and we want
-- this table to be safe to copy across deployments without dragging in
-- FK dependencies. Lifecycle is enforced by the `embeddings.delete`
-- job — see backend/src/queue/jobs/embeddings.delete.ts.
create table if not exists public.document_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null,
  user_id       uuid,                                       -- denormalized for future RLS predicates
  chunk_index   int not null,
  chunk_text    text not null,
  embedding     vector(1024),                               -- Cohere multilingual v3
  provider      text not null default 'cohere',
  model         text not null default 'embed-multilingual-v3.0',
  created_at    timestamptz not null default now(),
  metadata      jsonb not null default '{}'::jsonb          -- reserved for future filters (lang, page, section)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Vector index: cosine distance. IVFFlat with lists=100 is the default
-- starting point for ~10K-100K rows. Switch to HNSW once we cross
-- ~500K rows — IVFFlat recall degrades there without bumping `lists`.
create index if not exists idx_document_chunks_embedding_ivfflat
  on public.document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Hot path for the delete job: `DELETE FROM document_chunks WHERE document_id = $1`.
create index if not exists idx_document_chunks_document
  on public.document_chunks (document_id);

-- Composite for RLS-shaped reads ("show me chunks I own for this doc").
create index if not exists idx_document_chunks_user_document
  on public.document_chunks (user_id, document_id);

-- ---------------------------------------------------------------------------
-- RLS — service role only (the backend uses SUPABASE_SECRET_KEY and
-- bypasses RLS). Until we have per-user retrieval surfaced through
-- PostgREST, lock everyone else out. Embedding text is sensitive — it
-- mirrors document content verbatim and would leak through any anon
-- read.
-- ---------------------------------------------------------------------------
alter table public.document_chunks enable row level security;
revoke all on public.document_chunks from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------
insert into public._migrations (id) values ('2026-05-13-pgvector-embeddings')
on conflict (id) do nothing;
