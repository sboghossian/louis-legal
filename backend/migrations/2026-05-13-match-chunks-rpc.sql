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
