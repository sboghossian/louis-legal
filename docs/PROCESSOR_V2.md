# Processor v2

The "spend in proportion to stakes" layer on top of the skill router. Three
self-contained capabilities — an adaptive cost governor, a zero-LLM grounding
verifier, and a four-tier working memory — derived from the analysis in
[`LAVERN_INSPIRATION.md`](./LAVERN_INSPIRATION.md) (`AnttiHero/lavern`,
Apache-2.0; attribution preserved in the source headers).

The unifying idea: **Louis used to spend the same on every turn.** Processor v2
classifies the request first, sizes the compute it deserves, verifies the result
mechanically, and injects only the memory that has earned its place.

---

## 1. Adaptive cost governor (AC1)

**Where:** `backend/src/lib/llm/effort.ts`, `budget.ts`, `models.ts`;
`backend/src/skills/_router.ts`; wired at the `/chat` call site.

A request is classified into an **intensity** tier from message length plus the
classifier's complexity/risk/confidence signals:

| Intensity | `effort` | skill budget | model tier | budget × |
|-----------|----------|--------------|------------|----------|
| `quick`    | `low`    | 5  | `low`  | 0.3 |
| `standard` | `medium` | 9  | `mid`  | 1.0 |
| `thorough` | `high`   | 13 | `main` | 2.0 |

- `pickIntensity(signals)` chooses the base tier; `escalate()` bumps one tier
  when classifier confidence is low or risk is high (capped at `thorough`).
- The chosen `effort` flows into the Claude call site (gated no-op for
  non-Claude providers); the skill budget caps how many skills the router loads;
  the model tier maps into `models.ts`.
- A per-turn **budget guard** (`budget.ts`) estimates token spend and
  caps/flags a turn that would exceed a configurable ceiling
  (`LOUIS_TURN_BUDGET_USD`, default $1). **Live:** `chat.ts` calls
  `decideTurnBudget()` after the turn and emits a trailing
  `{"type":"budget","estUsd","ceilingUsd","over":true}` SSE event when over
  ceiling — an *alert*, never a block (decision #87).
- **Prompt caching:** a `cache_control: ephemeral` breakpoint is dropped on the
  stable skills/system-prompt prefix for Claude calls.
- **Telemetry:** one per-turn event via `skills/_observability.ts`
  `{ intensity, skillCount, effort, model, estCostUsd }`.

**Tests:** `effort.test.ts`, `budget.test.ts`.

## 2. Zero-LLM grounding verifier (AC2)

**Where:** `backend/src/grounding/` (`verifier.ts`, `types.ts`, `index.ts`);
surfaced in `backend/src/routes/chat.ts`.

```ts
import { verifyGrounding } from "@/grounding";

verifyGrounding({ findingText, document: { text, sectionRefs?, headings? } });
// → { score: 0..1, matched: [], unmatched: [], quotesChecked, refsChecked }
```

Pure string matching — **no LLM, no network**. Extracts quoted spans and
section references from the answer and checks each against the source document
(exact match → bounded fuzzy fallback). Boilerplate-only quotes
("in no event shall", …) earn no credit. A finding with nothing checkable is
vacuously grounded (`score = 1`).

**Surfaced on `/chat`:** after the answer streams, a best-effort block reads the
text of the documents the answer actually cited, runs `verifyGrounding`, and
emits a trailing SSE event:

```
data: {"type":"grounding","score":0.83,"matched":[…],"unmatched":[…],
       "quotesChecked":4,"refsChecked":2,"documentsChecked":1}
```

The block is isolated in its own try/catch and runs *after* the reply, so it can
never delay or break a successful answer. Turns that cite no source document emit
no grounding event. (It routes through `chat.ts`, **not** `citations/_engine.ts`,
which is separate WIP.)

**Tests:** `grounding/verifier.test.ts`.

## 3. Four-tier working memory (AC3)

**Where:** `backend/src/memory/` (`store.ts`, `ranking.ts`, `types.ts`,
`index.ts`).

```ts
import { memoryStore } from "@/memory";

memoryStore.put({ tier: "matter", content, tags: { jurisdiction: "UAE" }, scopeId });
memoryStore.query({ tier: "matter", tags: { jurisdiction: "UAE" }, limit: 8 });
memoryStore.recordOutcome(id, "helped");   // feedback weighting
memoryStore.reinforce(id);                 // precedent promotion
```

- **Tiers:** `session` · `matter` · `institutional` · `precedent`.
- **Tag-filtered retrieval** on `{ practiceArea, jurisdiction, docType }`. An
  entry with an `undefined` tag is broadly-applicable and matches any query
  value for that key; a specific tag only matches its value. `scopeId` narrows
  to an exact session/matter/client.
- **Effectiveness/recency ranking** (`ranking.ts`, pure): score =
  Laplace-smoothed helpfulness × exponential recency decay (default 30-day
  half-life). Helped ↑, stale ↓.
- **Precedent promotion:** `reinforce()` advances usage + helpfulness and
  promotes `tentative → confirmed` at `PROMOTION_THRESHOLD` recurrences.
- **Persistence seam:** everything is behind the `MemoryStore` interface;
  `InMemoryMemoryStore` ships now, a Supabase-backed store can drop in later
  (future SQL documented in `store.ts`).

- **Per-user isolation:** `userId` is a required field on every entry, input,
  and query — `query()` filters to the querying user across *all* tiers, so
  one user's memory can never surface in another's turn. (Sync in-memory store
  for now; Supabase-backed persistence is the next slice.)

**Live in the turn** (`context.ts`, wired in `chat.ts`):
- `buildMemoryContext(store, { userId, tags, matterId, sessionId, limit })`
  assembles a ranked "Working memory" block (institutional + precedent always
  eligible, matter/session gated by scope, all scoped to `userId`, tag-filtered,
  capped at 8) appended to the system prompt before the model call.
- After a successful turn, `summarizeTurnForMemory()` captures the exchange as a
  `matter`/`session` memory and the injected entries are `recordUsage`'d so
  their recency stays fresh. Both paths are fail-safe.
- *Follow-up:* link thumbs-up/down → `recordOutcome` (needs per-message
  memory-id persistence).

**Tests:** `memory/store.test.ts`, `memory/context.test.ts`.

---

## Running the checks

```bash
cd backend
npx tsc --noEmit     # typecheck, exit 0
npx vitest run       # grounding + effort + budget + memory suites
```

The repo standardizes Processor v2 tests on **vitest** (`vitest.config.ts`).
The legacy `skills/_llm-classifier.test.ts` predates vitest and still runs under
Node's built-in runner (`node --import tsx --test`), and is excluded from vitest
discovery.

## Out of scope (tracked separately)

- Hybrid local(Ollama)+frontier map-reduce triage (rides BullMQ).
- Workflow-template layer + adversarial "Full Bench" mode.
- Cohere rerank over the existing embeddings layer.
- Persisting memory tiers and the grounding score to Supabase.
