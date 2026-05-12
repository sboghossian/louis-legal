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
