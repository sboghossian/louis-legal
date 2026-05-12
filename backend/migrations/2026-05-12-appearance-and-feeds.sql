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
