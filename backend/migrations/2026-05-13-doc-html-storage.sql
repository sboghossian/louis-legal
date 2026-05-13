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
