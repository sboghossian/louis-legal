-- ============================================================
-- Louis — concatenated migrations bundle
-- ============================================================
-- This is the union of every .sql file under backend/migrations/
-- in dependency order. Paste into Supabase Dashboard → SQL Editor
-- → New query → Run. Each section ends with an insert into the
-- _migrations ledger so re-runs are tracked + idempotent.
--
-- For automated apply on a developer box, prefer
--   npm run migrate --prefix backend
-- with SUPABASE_DB_URL set in backend/.env (direct connection on
-- port 5432, NOT the pooler).
-- ============================================================

-- 2026-05-12: add user_profiles.appearance + user_profiles.feeds
--
-- Both columns ship as part of backend/schema.sql for fresh databases.
-- This migration is for existing Supabase projects that pre-date the
-- appearance / newsfeed work.
--
-- Apply it once: open Supabase → SQL editor → paste → Run.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'user_profiles'
      and column_name  = 'appearance'
  ) then
    alter table public.user_profiles
      add column appearance jsonb not null default '{}'::jsonb;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'user_profiles'
      and column_name  = 'feeds'
  ) then
    alter table public.user_profiles
      add column feeds jsonb not null default '[]'::jsonb;
  end if;
end;
$$;

-- ============================================================

-- 2026-05-13: persist the eight in-memory stores
--
-- Every page that today reads from a per-process Map gets a real DB
-- table here. Existing in-memory _store.ts files keep working as a
-- fallback for self-hosters who haven't applied this migration yet;
-- once applied, the routes flip to Supabase reads via the next
-- backend deploy.
--
-- Tables:
--   matters · matter_events
--   routines · routine_runs
--   inbox_read_state
--   integration_settings
--   referral_codes
--   team_invites
--   billing_state
--   legal_flow_runs
--
-- Apply once: Supabase → SQL editor → paste → Run. (Or via the new
-- `npm run migrate` script, which auto-runs every file under
-- backend/migrations/ that hasn't been recorded in _migrations.)

-- ---------------------------------------------------------------------------
-- Migration ledger
-- ---------------------------------------------------------------------------
create table if not exists public._migrations (
  id text primary key,
  applied_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Matters
-- ---------------------------------------------------------------------------
create table if not exists public.matters (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  matter_number text not null,
  client_name text not null,
  matter_type text not null,
  practice_area text,
  status text not null default 'open',
  jurisdictions text[] not null default '{}',
  parties jsonb not null default '[]',
  description text,
  responsible_attorney text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  budget_amount numeric,
  budget_currency text default 'AED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_matters_user_id on public.matters(user_id);
create index if not exists idx_matters_status  on public.matters(status);

create table if not exists public.matter_events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters(id) on delete cascade,
  event_type text not null,
  description text not null,
  event_date date,
  metadata jsonb,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_matter_events_matter on public.matter_events(matter_id);

-- ---------------------------------------------------------------------------
-- Routines (scheduled AI tasks)
-- ---------------------------------------------------------------------------
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  description text,
  prompt text not null,
  cron_expression text not null,        -- e.g. '0 9 * * MON'
  timezone text not null default 'UTC',
  enabled boolean not null default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  output_destination text,              -- 'inbox' | 'email' | 'webhook:<url>'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_routines_user_id  on public.routines(user_id);
create index if not exists idx_routines_next_run on public.routines(next_run_at)
  where enabled;

create table if not exists public.routine_runs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',  -- running | done | failed
  output text,
  error text
);
create index if not exists idx_routine_runs_routine on public.routine_runs(routine_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Inbox read-state (notifications are derived from other tables; only the
-- per-user "I've seen this" bit is persisted)
-- ---------------------------------------------------------------------------
create table if not exists public.inbox_read_state (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  entry_id text not null,
  read_at timestamptz not null default now(),
  unique(user_id, entry_id)
);
create index if not exists idx_inbox_read_state_user on public.inbox_read_state(user_id);

-- ---------------------------------------------------------------------------
-- Integration settings (per-user OAuth / API-key state + enabled flag)
-- ---------------------------------------------------------------------------
create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  integration_id text not null,          -- 'slack' | 'gmail' | 'docusign' | ...
  status text not null default 'disconnected', -- 'connected' | 'disconnected' | 'needs-reauth' | 'coming-soon'
  config jsonb not null default '{}'::jsonb,   -- per-integration credentials snapshot (encrypted at app layer)
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, integration_id)
);
create index if not exists idx_integration_settings_user on public.integration_settings(user_id);

-- ---------------------------------------------------------------------------
-- Referral
-- ---------------------------------------------------------------------------
create table if not exists public.referral_codes (
  user_id text primary key,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id text not null,
  referred_email text,
  referred_user_id text,
  stage text not null default 'clicked',  -- clicked | signed-up | converted | rewarded
  reward_amount numeric,
  reward_currency text default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_referral_attr_referrer on public.referral_attributions(referrer_user_id);

-- ---------------------------------------------------------------------------
-- Team
-- ---------------------------------------------------------------------------
create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id text not null,
  invitee_email text not null,
  role text not null default 'member',     -- 'admin' | 'member' | 'read-only'
  status text not null default 'pending',  -- 'pending' | 'accepted' | 'revoked'
  invited_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists idx_team_invites_inviter on public.team_invites(inviter_user_id);
create index if not exists idx_team_invites_email   on public.team_invites(invitee_email);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null,             -- the firm/org owner
  member_user_id text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  unique(owner_user_id, member_user_id)
);
create index if not exists idx_team_members_owner on public.team_members(owner_user_id);

-- ---------------------------------------------------------------------------
-- Billing state (current plan + Stripe customer/subscription id)
-- ---------------------------------------------------------------------------
create table if not exists public.billing_state (
  user_id text primary key,
  plan text not null default 'free',       -- 'free' | 'pro' | 'firm'
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Legal flow runs (instances of structured multi-step legal workflows)
-- ---------------------------------------------------------------------------
create table if not exists public.legal_flow_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  template_id text not null,               -- e.g. 'nda-to-signed', 'vendor-kyc'
  matter_id uuid references public.matters(id) on delete set null,
  status text not null default 'running',
  state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists idx_legal_flow_runs_user   on public.legal_flow_runs(user_id);
create index if not exists idx_legal_flow_runs_matter on public.legal_flow_runs(matter_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.matters             enable row level security;
alter table public.matter_events       enable row level security;
alter table public.routines            enable row level security;
alter table public.routine_runs        enable row level security;
alter table public.inbox_read_state    enable row level security;
alter table public.integration_settings enable row level security;
alter table public.referral_codes      enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.team_invites        enable row level security;
alter table public.team_members        enable row level security;
alter table public.billing_state       enable row level security;
alter table public.legal_flow_runs     enable row level security;

-- The backend operates with the service-role key so it bypasses RLS;
-- nothing else has direct table access. Lock everything down by
-- revoking from anon/authenticated. The policies below are written so
-- that *if* PostgREST anon/authenticated access is ever re-enabled,
-- the user-scoped semantics still hold.

revoke all on public.matters             from anon, authenticated;
revoke all on public.matter_events       from anon, authenticated;
revoke all on public.routines            from anon, authenticated;
revoke all on public.routine_runs        from anon, authenticated;
revoke all on public.inbox_read_state    from anon, authenticated;
revoke all on public.integration_settings from anon, authenticated;
revoke all on public.referral_codes      from anon, authenticated;
revoke all on public.referral_attributions from anon, authenticated;
revoke all on public.team_invites        from anon, authenticated;
revoke all on public.team_members        from anon, authenticated;
revoke all on public.billing_state       from anon, authenticated;
revoke all on public.legal_flow_runs     from anon, authenticated;

-- Record this migration as applied (no-op if the row already exists).
insert into public._migrations (id) values ('2026-05-13-persist-product-state')
on conflict (id) do nothing;

-- ============================================================

-- 2026-05-13: persist public API tokens
--
-- The /api/v1/* surface (see backend/src/routes/public-api.ts) shipped with
-- an in-memory Map keyed on SHA-256(token), which meant every backend
-- restart silently invalidated every customer's `pk_louis_...` key. This
-- migration moves that store into a real Supabase table so tokens survive
-- restarts and can be listed/revoked across processes.
--
-- The route hashes the secret with SHA-256 before any DB call, so the
-- plaintext token never reaches Postgres. The label and prefix are safe to
-- display in the UI; `token_hash` is what we look up on every authenticated
-- request.
--
-- Apply once: Supabase → SQL editor → paste → Run. (Or via
-- `npm run migrate`, which reads from public._migrations.)

-- ---------------------------------------------------------------------------
-- public_api_tokens
-- ---------------------------------------------------------------------------
create table if not exists public.public_api_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token_hash  text not null unique,         -- SHA-256(pk_louis_<random>), hex
  label       text,
  prefix      text,                          -- first ~12 chars, safe to show
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  expires_at  timestamptz,                   -- null = non-expiring
  revoked_at  timestamptz
);

-- Hot path: auth middleware does
--   SELECT user_id FROM public_api_tokens
--   WHERE token_hash = $1 AND revoked_at IS NULL
-- Partial index keeps it tight (revoked rows stick around for audit but
-- aren't part of the lookup set).
create index if not exists idx_public_api_tokens_active_hash
  on public.public_api_tokens (token_hash)
  where revoked_at is null;

create index if not exists idx_public_api_tokens_user
  on public.public_api_tokens (user_id);

-- ---------------------------------------------------------------------------
-- RLS — service role only
-- ---------------------------------------------------------------------------
alter table public.public_api_tokens enable row level security;

-- The backend uses the service-role key and bypasses RLS. Nothing else
-- should ever read this table — token hashes are sensitive and listing
-- another user's `prefix` would be an information leak. Revoke from
-- anon/authenticated explicitly so even if PostgREST is exposed, this
-- table stays opaque.
revoke all on public.public_api_tokens from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------
insert into public._migrations (id) values ('2026-05-13-public-api-tokens')
on conflict (id) do nothing;

-- ============================================================

-- 2026-05-13: doc-workspace HTML storage
--
-- The TipTap rich-text editor (commit 54eefd9) stores documents as HTML
-- internally, but the existing read path only returns `ServerBlock[]`
-- (`{ heading, text }`) reconstructed from plain-text extraction of the
-- uploaded DOCX/PDF. That round-trip destroys inline formatting (bold,
-- italic, links) AND the editor's two killer features — comments and
-- track-changes — which are encoded as ProseMirror marks inside the HTML.
--
-- This migration adds an authoritative HTML column on `public.documents`
-- so the editor can persist its canonical state without losing structure.
--
-- We KEEP the existing `blocks`-derived read path (the route still extracts
-- text from the underlying storage object when no html_content is present),
-- so legacy docs uploaded before this migration continue to render. New
-- saves go through `html_content`; the route returns both fields so the
-- frontend prefers HTML when present and falls back to blocks otherwise.
--
-- Apply once: Supabase → SQL editor → paste → Run. (Or via
-- `npm run migrate`, which reads from public._migrations.)

-- ---------------------------------------------------------------------------
-- documents: add html_content + version counter
-- ---------------------------------------------------------------------------
alter table public.documents
  add column if not exists html_content text;

-- Optimistic-concurrency counter for the HTML payload. The PUT endpoint
-- checks the client's `version` against this column and rejects with 409
-- if it doesn't match — this is what prevents two open tabs from silently
-- clobbering each other. Starts at 1 so the first write goes from 1 → 2.
--
-- It's intentionally NOT the same number as `document_versions.version_number`
-- (which is the human-visible draft number). This counter ticks on every
-- autosave; document_versions ticks only on a manual snapshot or AI edit.
alter table public.documents
  add column if not exists html_content_version integer not null default 1;

-- Last-saved-at for the HTML payload. Useful for the bottom-bar "saved at"
-- badge so it survives a refresh, and for showing "edited X minutes ago"
-- in the document list.
alter table public.documents
  add column if not exists html_content_saved_at timestamptz;

-- Lookup index: doc-workspace queries are always `id = $1` so the primary
-- key handles it, but the row is now substantially larger because of the
-- HTML column. No additional index needed.

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------
insert into public._migrations (id) values ('2026-05-13-doc-html-storage')
on conflict (id) do nothing;

-- ============================================================

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

-- ============================================================

-- Migration: 2026-05-13-match-chunks-rpc
-- Adds a Postgres RPC for IVFFlat-indexed nearest-neighbour search over the
-- `document_chunks` table. The TypeScript `topK()` helper falls back to a
-- candidate-window + JS-side cosine sort when this RPC is absent; once this
-- migration runs, it pivots to a single round-trip that actually hits the
-- ivfflat index.
--
-- Why: `supabase-js` cannot express the vector operator `<=>` in its
-- builder, and PostgREST has no clean way to ORDER BY a computed
-- distance. A SECURITY DEFINER function bridges the gap without
-- exposing raw SQL execution.

create or replace function public.match_chunks(
    query_vector vector(1024),
    match_count int default 13,
    filter_document_id uuid default null,
    filter_user_id uuid default null
)
returns table (
    id uuid,
    document_id uuid,
    chunk_text text,
    similarity float
)
language sql
stable
parallel safe
as $$
    select
        c.id,
        c.document_id,
        c.chunk_text,
        1 - (c.embedding <=> query_vector) as similarity
    from public.document_chunks c
    where
        c.embedding is not null
        and (filter_document_id is null or c.document_id = filter_document_id)
        and (filter_user_id is null or c.user_id = filter_user_id)
    order by c.embedding <=> query_vector
    limit greatest(1, least(200, match_count))
$$;

-- Lock down: invoke via service role / RLS-aware caller only.
revoke all on function public.match_chunks(vector, int, uuid, uuid) from public;
revoke all on function public.match_chunks(vector, int, uuid, uuid) from anon;
revoke all on function public.match_chunks(vector, int, uuid, uuid) from authenticated;
-- service_role is implicitly granted; if your project uses a different
-- function-execution role, grant it here.

comment on function public.match_chunks is
    'IVFFlat-indexed cosine search over document_chunks. Returns the top `match_count` rows by similarity (1 - cosine distance), optionally filtered by document_id and/or user_id. Service-role only.';

insert into public._migrations (name) values ('2026-05-13-match-chunks-rpc');
