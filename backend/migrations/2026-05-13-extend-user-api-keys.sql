-- 2026-05-13: extend user_api_keys to cover all 14 BYO-key providers
--
-- The product is BYO-LLM-key (decision #7). The original table shipped
-- with a check constraint limiting it to claude / gemini / openai, and a
-- unique(user_id, provider) constraint that prevented multiple keys per
-- provider. The /settings/api-keys UI was wired against a parallel
-- in-memory store (backend/src/apiKeys/_store.ts) that covered 14
-- providers but lost data on every restart. This migration unifies
-- both surfaces on this encrypted table.
--
-- Apply once: Supabase → SQL editor → paste → Run. (Or via
-- `npm run migrate`, which reads from public._migrations.)
--
-- Schema changes:
--   - Drop the check constraint on provider so any string is valid. The
--     14-provider catalog is enforced in app code (lib/userApiKeysExtended.ts);
--     adding a new provider should not require a DB migration.
--   - Drop the unique(user_id, provider) constraint so users can store
--     multiple keys per provider (dev / staging / prod).
--   - Add `label` (free-form), `is_default` (which row to use when nothing
--     else specifies), `last_used_at`.
--   - Partial unique index ensures at most one default per (user, provider).

alter table public.user_api_keys
  drop constraint if exists user_api_keys_provider_check;

alter table public.user_api_keys
  drop constraint if exists user_api_keys_user_id_provider_key;

alter table public.user_api_keys
  add column if not exists label text,
  add column if not exists is_default boolean not null default false,
  add column if not exists last_used_at timestamptz;

-- One default key per (user, provider). Backfill existing rows as default
-- before creating the partial unique index so the first call doesn't see
-- "no default" for users who already have a key stored.
update public.user_api_keys
   set is_default = true
 where is_default is distinct from true;

create unique index if not exists idx_user_api_keys_one_default
  on public.user_api_keys (user_id, provider)
  where is_default;
