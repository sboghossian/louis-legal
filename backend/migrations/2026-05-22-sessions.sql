-- Wave 3: durable sessions / hydrate-from-archive.
-- Backs SupabaseSessionStore (backend/src/sessions/supabaseStore.ts). Idempotent.

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- owner; every read is user-scoped
  data jsonb NOT NULL DEFAULT '{}'::jsonb,                           -- opaque payload: chat history, workflow step, etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
-- Secondary index on updated_at supports future archive-tiering queries
-- (e.g. "sessions not touched in 30 days") without a full-table scan.
CREATE INDEX IF NOT EXISTS sessions_updated_at_idx ON sessions (updated_at);

-- Row-level security: a user can only see/touch their own sessions. The server
-- uses the service-role key (bypasses RLS) but enabling it is defence-in-depth
-- for any future anon/auth-key access path.
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_owner ON sessions;
CREATE POLICY sessions_owner ON sessions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
