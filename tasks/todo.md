# Supabase-backed memory persistence (yalla)

Branch: `feat/pv2-supabase-memory` · Base: `main` · Spec: `docs/PROCESSOR_V2.md`

The four-tier memory store is a process-global in-memory `Map` — **everything is
lost on restart** (flagged in the 2026-05-13 audit). This slice adds a
Supabase-backed implementation behind the existing `MemoryStore` interface so
memory survives restarts and is truly multi-tenant. The interface must go
**async** to support a DB. Behaviour is unchanged when Supabase isn't
configured (falls back to in-memory).

## Definition of done (3 testable criteria)

### AC1 — MemoryStore interface is async (no behaviour change)
- Every `MemoryStore` method returns a `Promise`. `InMemoryMemoryStore` updated
  (still a process-local Map, now async). `buildMemoryContext` becomes async and
  `await`s the tier queries. `chat.ts` `await`s memory injection + capture +
  `recordUsage`.
- Existing memory tests (`store.test.ts`, `context.test.ts`) updated to
  `await`; all still pass.
- **Test:** `npx vitest run` green, `npx tsc --noEmit` exit 0.

### AC2 — SupabaseMemoryStore + migration
- New `backend/src/memory/supabaseStore.ts` implements `MemoryStore` against a
  `memory_entries` table via `createServerSupabase()`: writes on `put`, reads +
  in-process `rankEntries` on `query`, atomic-ish counter updates on
  `recordOutcome`/`recordUsage`/`reinforce`. Pure row↔entry mappers
  (`rowToEntry`/`entryToRow`) are exported and unit-tested.
- New migration `backend/migrations/2026-05-22-memory-entries.sql` creating the
  table (id, user_id, tier, content, scope_id, practice_area, jurisdiction,
  doc_type, counts, status, timestamps) + indexes — matching the schema
  documented in `store.ts`.
- **Test:** `rowToEntry`/`entryToRow` round-trip unit test (no DB) passes;
  module typechecks. (Live DB I/O is not unit-tested — no DB in CI.)

### AC3 — Env-based factory, safe fallback
- A `createMemoryStore()` factory returns `SupabaseMemoryStore` when Supabase
  env is configured, else `InMemoryMemoryStore`; the exported `memoryStore` uses
  it. No code path changes behaviour when Supabase is absent.
- **Test:** factory returns in-memory when env unset (unit test). Full
  `npx tsc --noEmit` 0, `npx vitest run` green, `npm run build` 0.

## Out of scope (this slice)
- Applying the migration to the live Supabase project (deploy step).
- Thumbs-up/down → `recordOutcome` wiring.
- Backfilling existing in-memory data (there is none persistent).

## Status
- [x] shipped: async interface + SupabaseMemoryStore + factory + migration; typecheck 0, vitest 71/71, build 0; reviewed
