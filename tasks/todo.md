# Per-user memory isolation — the multi-tenant prerequisite (yalla)

Branch: `feat/pv2-isolation` · Base: `feat/pv2-live` (PR #2) · Spec: `docs/PROCESSOR_V2.md`

The four-tier `memoryStore` is a process-global in-memory Map with **no owner on
entries**. Scoped tiers (matter/session) are id-gated so blast radius is zero
today, but `institutional`/`precedent` have no user gate — the moment anything
writes them they leak across users. This slice makes ownership a first-class,
required field so the store is safe for multi-tenant use. (Supabase persistence
stays a separate follow-up — this slice keeps the sync in-memory impl.)

## Definition of done (3 testable criteria)

### AC1 — Every entry is owned, every read is user-scoped
- `MemoryEntry.userId` (required) + `MemoryInput.userId` (required); `put`
  persists it. `MemoryQuery.userId` (required); `query` returns **only** the
  querying user's entries, across ALL tiers (including institutional/precedent).
- **Test (vitest):** user A's entries (one per tier) never appear in user B's
  query; user A still retrieves their own; tag/scope/ranking behaviour unchanged
  for a single user.

### AC2 — Context + capture threaded with userId
- `buildMemoryContext(store, { userId, ... })` requires `userId` and passes it
  into every tier query. `chat.ts` passes the authenticated user id into both
  the injection and the post-turn capture (`put` includes `userId`).
- **Test (vitest):** `buildMemoryContext` for user A excludes user B's seeded
  entries in every tier; returns A's own ranked block.

### AC3 — Green + builds + no leak regression
- Existing `memory/store.test.ts`, `memory/context.test.ts` updated for the
  required `userId`.
- **Test:** `npm run typecheck` exit 0, `npx vitest run` fully green, AND
  `npm run build --prefix backend` succeeds (compiles TS + copies skills).

## Deliverable + merge plan (per Stephane)
- Stacked PR `feat/pv2-isolation` → `feat/pv2-live`.
- Then **test everything** (typecheck + vitest + backend build + frontend lint)
  and **merge PR #1 + PR #2 + this PR into `main`** in order.

## Out of scope (this slice)
- Supabase-backed async `MemoryStore` (separate slice — interface goes async).
- Thumbs-up/down → `recordOutcome` link.

## Status
- [x] shipped: per-user isolation; typecheck 0, vitest 68/68, backend build 0
