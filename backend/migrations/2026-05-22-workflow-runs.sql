-- Wave 2: workflow run store.
-- Backs SupabaseRunStore (backend/src/workflows/supabaseRunStore.ts). Idempotent.

CREATE TABLE IF NOT EXISTS workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- owner; every list read is user-scoped
  template_id text NOT NULL,           -- WorkflowTemplate id (e.g. 'contract-review')
  status text NOT NULL DEFAULT 'queued', -- queued|running|gated|assembling|done|failed
  current_step_index integer NOT NULL DEFAULT 0,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb, -- Finding[]
  input jsonb,                         -- free-form run parameters (matter id, doc refs, options)
  deliverable text,                    -- assembled output, set during assembling -> done
  error text,                          -- failure reason, set only when status = 'failed'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_runs_user_id_idx ON workflow_runs (user_id);
CREATE INDEX IF NOT EXISTS workflow_runs_status_idx ON workflow_runs (status);
CREATE INDEX IF NOT EXISTS workflow_runs_template_idx ON workflow_runs (template_id);

-- Row-level security: a user can only see/touch their own runs. The server uses
-- the service-role key (bypasses RLS) but enabling it is defence-in-depth for
-- any future anon/auth-key access path. Mirrors memory_entries.
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_runs_owner ON workflow_runs;
CREATE POLICY workflow_runs_owner ON workflow_runs
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
