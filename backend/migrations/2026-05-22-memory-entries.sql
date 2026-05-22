-- Processor v2: persistent four-tier working memory.
-- Backs SupabaseMemoryStore (backend/src/memory/supabaseStore.ts). Idempotent.

CREATE TABLE IF NOT EXISTS memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- owner; every read is user-scoped
  tier text NOT NULL,                 -- 'session' | 'matter' | 'institutional' | 'precedent'
  content text NOT NULL,
  scope_id text,                      -- session id (session tier) / matter id (matter tier) / client id (precedent)
  practice_area text,
  jurisdiction text,
  doc_type text,
  helpful_count integer NOT NULL DEFAULT 0,
  unhelpful_count integer NOT NULL DEFAULT 0,
  usage_count integer NOT NULL DEFAULT 0,
  status text,                        -- precedent only: 'tentative' | 'confirmed'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memory_entries_user_id_idx ON memory_entries (user_id);
CREATE INDEX IF NOT EXISTS memory_entries_tier_idx ON memory_entries (tier);
CREATE INDEX IF NOT EXISTS memory_entries_scope_idx ON memory_entries (scope_id);

-- Row-level security: a user can only see/touch their own memory. The server
-- uses the service-role key (bypasses RLS) but enabling it is defence-in-depth
-- for any future anon/auth-key access path.
ALTER TABLE memory_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memory_entries_owner ON memory_entries;
CREATE POLICY memory_entries_owner ON memory_entries
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
