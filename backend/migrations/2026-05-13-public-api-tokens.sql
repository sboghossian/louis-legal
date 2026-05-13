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
