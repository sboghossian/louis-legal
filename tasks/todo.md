# Processor v2 goes live — memory injection + turn capture + budget alert (yalla)

Branch: `feat/pv2-live` · Base: `feat/processor-v2` (PR #1) · Spec: `docs/PROCESSOR_V2.md`

Processor v2 modules shipped in PR #1 but are **dormant**: `memoryStore` is
imported nowhere and the budget guard is never enforced. This slice makes them
live in the `/chat` turn. Behavior is **additive and safe** — memory only adds
context, the budget guard only *alerts* (decision #87), and every new path is
isolated so it can never break a turn.

## Definition of done (3 testable criteria)

### AC1 — Earned memory is injected into the turn
- New **pure** helper `buildMemoryContext(store, query)` in `backend/src/memory/`
  returns a formatted "Working memory" prompt block from the top-N ranked
  entries for a turn: `session`/`matter` filtered by `scopeId`,
  `institutional`/`precedent` always eligible, all tag-filtered by
  `{practiceArea, jurisdiction}` and capped at N (default 8). Empty store / no
  matches → empty string.
- Wired into `routes/chat.ts`: the block is appended to
  `routeDecision.systemPromptExtra` before `buildMessages`, using
  `routeDecision.intent.{practiceArea,jurisdiction}` for tags and the
  resolved project/matter id for scope.
- **Test (vitest):** seeded entries → block contains the right entries, ranked
  by effectiveness×recency, capped at N, wrong-jurisdiction excluded, empty
  store → `""`. `npx tsc --noEmit` exit 0.

### AC2 — The turn is captured back into memory
- New **pure** helper `summarizeTurnForMemory({ userMessage, assistantText })`
  returns bounded memory content (≤ a fixed char cap), or `null` for
  empty/trivial turns.
- Wired into `routes/chat.ts` (in the existing post-stream block, fail-safe):
  after a successful turn, `put` a `matter`-tier (or `session`-tier when no
  matter) memory of the exchange and `recordUsage` on every entry that was
  injected this turn (advances recency).
- **Test (vitest):** helper returns bounded non-empty content for a normal
  turn, `null` for empty assistantText; `recordUsage` advances `usageCount`
  and `lastUsedAt` (already covered — assert the wiring contract via the
  helper).

### AC3 — Budget guard alerts live
- New **pure** helper `decideTurnBudget({ model, estimatedTokens })` in
  `lib/llm/budget.ts` → `{ estUsd, ceilingUsd, withinBudget }` (composes the
  existing `estimateTurnCostUsd` + `turnBudgetCeilingUsd` + `withinBudget`).
- Wired into `routes/chat.ts`: when a turn is estimated over ceiling, emit a
  trailing `budget` SSE event `{ type:"budget", estUsd, ceilingUsd, over:true }`.
  **Alert only — never blocks the turn** (decision #87).
- **Test (vitest):** `decideTurnBudget` flags over/under correctly around the
  ceiling. `npx vitest run` fully green.

### Integration / deliverable
- All three wired into `routes/chat.ts`; full `npm run typecheck` exit 0 and
  `npx vitest run` green; README + `docs/PROCESSOR_V2.md` updated to mark these
  capabilities **live**; single PR opened against `main` (or stacked on PR #1).

## Out of scope (this slice)
- Thumbs-up/down → `recordOutcome` link (needs per-message memory-id
  persistence — follow-up).
- Persisting memory tiers to Supabase (interface seam already exists).
- Model-tier downgrade on budget breach (alert-only for now).

## Status
- [x] shipped: memory injection + turn capture + budget alert live; reviewed; green
