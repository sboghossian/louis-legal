-- 2026-05-13: persist Drafting Board state server-side
--
-- The frontend has always stored boards in localStorage, which means a
-- user with a half-finished M&A flow on their work laptop saw nothing on
-- their phone. This migration moves the canonical state to Supabase so
-- boards travel with the user and survive a browser cache clear.
--
-- The board payload is whatever lib/components/drafting/types.ts emits,
-- stored opaquely as JSONB — the frontend already understands the shape
-- and we don't want a migration every time we add a node-status field.
--
-- Apply once: Supabase → SQL editor → paste → Run. (Or via
-- `npm run migrate`, which reads from public._migrations.)

create table if not exists public.drafting_boards (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  template_key text not null,                  -- e.g. "ma-acquisition", "nda-mutual"
  name         text,
  payload      jsonb not null,                 -- full Board shape (nodes/edges/runMessages/…)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(user_id, template_key)
);

create index if not exists idx_drafting_boards_user
  on public.drafting_boards (user_id, updated_at desc);

alter table public.drafting_boards enable row level security;

-- RLS via the service-role-only pattern used by the rest of the app
-- (everything goes through the Node backend which already authenticates
-- the request with requireAuth + scopes by user_id).
revoke all on public.drafting_boards from anon, authenticated;
