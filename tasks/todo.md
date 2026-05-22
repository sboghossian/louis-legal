# Thumbs → recordOutcome: close the memory feedback loop (yalla)

Branch: `feat/pv2-memory-feedback` · Base: `main` · Spec: `docs/PROCESSOR_V2.md`

Memory effectiveness currently only moves on recency (`recordUsage`). The
"earned memory" promise needs user signal: when a lawyer thumbs-up/down an
answer, the memory that informed it should rise/fall. The link is the
`chat_messages.annotations` jsonb already persisted per assistant message.

## Definition of done (3 testable criteria)

### AC1 — Assistant messages record which memory informed them
- Pure `memoryUsedAnnotation(entryIds)` → `{ type: "memory_used", ids }` or
  `null` (empty/invalid ids). `chat.ts` appends it to the `annotations` array
  persisted with the assistant message (only when a user + injected entries
  exist).
- **Test (vitest):** returns the annotation for non-empty ids, `null` for empty;
  filters non-string ids.

### AC2 — A thumbs rating feeds the effectiveness loop
- Pure helpers: `extractMemoryUsedIds(annotations)` (defensive parse),
  `ratingToOutcome("up"|"down")` → `helped|unhelpful`, and
  `applyMemoryFeedback(store, ids, rating)` (calls `recordOutcome` per id,
  parallel, best-effort).
- `routes/feedback.ts`: when a rating is **set** (not the toggle-clear path),
  read the rated message's `annotations`, extract the memory ids, and apply the
  outcome. Isolated in try/catch — feedback must never fail because memory does.
- **Test (vitest):** `extractMemoryUsedIds` parses valid + ignores junk;
  `ratingToOutcome` maps both ways; `applyMemoryFeedback` on an
  `InMemoryMemoryStore` moves an entry's rank (helped ↑ / unhelpful ↓).

### AC3 — Green
- `npx tsc --noEmit` 0, `npx vitest run` green, `npm run build` 0.

## Out of scope (this slice)
- Decrementing on toggle-clear (recordOutcome only increments; clear is a no-op).
- Cross-user nuance: in a shared project chat, rater ≠ turn author still records
  on the author's memory (access-controlled; acceptable — note as follow-up).
- Atomic counter RPC (separate pre-prod TODO).

## Status
- [x] shipped: thumbs→recordOutcome feedback loop; owner-gated; typecheck 0, vitest 79/79, build 0; reviewed
