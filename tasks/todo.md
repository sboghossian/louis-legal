# Processor v2 — Lavern-inspired build (yalla)

Branch: `feat/processor-v2` · Base: `main` · Spec: `docs/LAVERN_INSPIRATION.md`

## Definition of done (3 testable criteria)

### AC1 — Adaptive cost governor
- `routeAsync()` returns an `intensity` tier (`quick | standard | thorough`)
  derived from request complexity (message length + classifier signal).
- Intensity drives **(a)** adaptive skill count (quick < standard < thorough,
  never exceeds the existing max), **(b)** a recommended model tier
  (quick→LOW/MID, thorough→MAIN), and **(c)** an `effort` control passed to the
  Claude call site (gated — no-op for non-Claude providers).
- A per-turn budget guard estimates token spend and caps/flags when a turn would
  exceed a configurable ceiling.
- **+ Prompt caching:** drop a `cache_control: ephemeral` breakpoint on the
  stable skills/system-prompt prefix for Claude calls (no-op other providers).
- **+ Confidence-based escalation:** start at the intensity's tier; bump one
  tier when classifier confidence is low or risk = high.
- **+ Telemetry:** emit one per-turn event via `_observability.ts`
  `{intensity, skillCount, effort, model, estCostUsd}`.
- **Test:** unit tests assert quick→fewer skills + low effort + cheaper model;
  thorough→more skills + high effort + main model; low-confidence→tier bump;
  cache breakpoint present on Claude payload. `npm run typecheck` exit 0.

### AC2 — Zero-LLM grounding verifier
- New `backend/src/grounding/` exports `verifyGrounding(text, parsedDoc)` →
  `{ score: 0..1, matched: [], unmatched: [] }`. Pure: no LLM, no network.
  Cross-checks quoted text + section refs against the parsed document; ignores
  boilerplate-only citations.
- **+ Surfaced:** Agent A wires `verifyGrounding()` into the `/chat` response as
  a `grounding` field (routes through `chat.ts`, NOT `citations/_engine.ts`
  which is uncommitted WIP).
- **Test:** unit tests cover exact-quote match, missing citation, section-ref
  match, boilerplate-only → not credited. `npx vitest run` green.

### AC3 — Four-tier memory + feedback weighting
- New `backend/src/memory/` exposes a store with Session / Matter /
  Institutional / Precedent tiers, tag-filtered retrieval
  (`{practiceArea, jurisdiction, docType}`), and effectiveness-weighted ranking
  (helped ↑, stale ↓). Persistence behind an interface (in-memory impl + space
  for Supabase later).
- **Test:** unit tests cover tier write/read, tag filter, weighting order.
  `npx vitest run` green.

### Integration / deliverable
- All three converge into `feat/processor-v2`; full `npm run typecheck` exit 0
  and `npx vitest run` fully green; single PR opened against `main`.

## Parallel agent decomposition (worktree-isolated, disjoint files)
- **Agent A — Cost governor:** `_router.ts`, new `lib/llm/effort.ts`,
  `lib/llm/models.ts` (tier helper), Claude call site, minimal `routes/chat.ts`
  wiring, new `lib/llm/budget.ts`. (AC1)
- **Agent B — Grounding:** `backend/src/grounding/*` only (new files). (AC2)
- **Agent C — Memory:** `backend/src/memory/*` only (new files). (AC3)
- Integration owner: main thread merges B + C (additive) then A; resolves
  conflicts; runs full typecheck + vitest; opens PR.

## Out of scope (this PR)
- Hybrid local+frontier Ollama triage (L — rides BullMQ, separate PR)
- Workflow-template layer + Full Bench adversarial mode (L — separate PR)
- Cohere rerank upgrade (cohere-ai already a dep; separate PR)

## Status
- [ ] tayyeb received → fire agents
