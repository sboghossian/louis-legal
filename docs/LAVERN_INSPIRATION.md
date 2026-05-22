# Lavern → Louis: ideas worth stealing

A study of [`AnttiHero/lavern`](https://github.com/AnttiHero/lavern) (v0.15.0,
Apache-2.0) read against Louis, focused on three things we want to improve:
**credit/token cost, context memory, and agentic processing.**

Lavern is published explicitly as a parts donor — *"It is at least ten things,
several of which are products somebody could build a company around. Take
whichever ones you want."* This doc is our shortlist of what to take and how it
maps onto Louis's actual code.

License note: Lavern is Apache-2.0, compatible with Louis's AGPL lineage (the
`willchen96/mike` fork). Preserve attributions from Lavern's `NOTICE` for any
code we port. The bundled datasets carry their own CC BY / CC BY-SA licenses
(attribution only); skip ContractNLI (non-commercial).

---

## The one idea behind all of it

> **Louis spends the same on every turn.** `route()` in
> `backend/src/skills/_router.ts` runs on every `/chat`, loads 8–13 skills
> regardless of difficulty, and fires one frontier call.
>
> **Lavern spends in proportion to stakes.** A cheap model classifies the
> request *first* and decides how much compute it deserves — which workflow,
> how many specialists, what `effort` level, what budget — before the expensive
> work runs.

Everything below is a consequence of that inversion.

---

## Lens A — Performance / credits

Louis today has no effort scaling, no per-turn cost cap, and no cheap path for
easy questions. Lavern has a full cost-governor stack.

### 1. Router as cost governor — *highest ROI*

`src/router/router.ts` + `src/dispatch.ts`. A ~$0.01 Sonnet call with
**structured output** classifies every request (complexity, risk, the *minimum
viable workflow*, and which specialists to wake), with a deterministic fallback
if the LLM fails or hallucinates a workflow.

**Louis mapping:** our `route()` is keyword-based and always composes the same
8–13 skills into `systemPromptExtra`. Replace "always load everything" with
"load what this request needs" + pick an effort tier. This is decision #21
(auto-route) and turns #23 (show 8–13 skills) into *adaptive 1–13*.

### 2. Intensity dial → Claude `effort` parameter

`src/types/engagement.ts`. Four profiles map directly to the Claude API effort
level and a budget multiplier:

| Intensity | effort | budget × | team | gates | est. time |
|-----------|--------|----------|------|-------|-----------|
| quick     | low    | 0.3×     | 3    | none  | 2–5 min   |
| standard  | medium | 1.0×     | 6    | critical | 10–25 min |
| thorough  | high   | 2.0×     | 10   | standard | 25–60 min |
| maximal   | max    | 4.0×     | 14   | all   | 60–180 min |

**Louis mapping:** we don't pass `effort` at all today. A simple query should
run `effort: low`; a high-stakes review `max`. This is decision #24 (reasoning
budget capped at user setting) made real, and free token savings on easy turns.

### 3. Model tiering by task

`config.ts`: Opus 4.7 for orchestration, **Sonnet for routing + batch**, Haiku
for cleanup passes. Tiering just the router and post-processing steps off Opus
is a large credit cut with no quality loss on those steps.

### 4. Hybrid local + frontier map-reduce — *the standout*

`src/claw/local-analysis.ts` + `src/claw/hybrid-analysis.ts`. Ollama does
clause-level triage **on-device at $0**; only RED/major/critical clauses
escalate to the frontier model, and entities are anonymized before they leave
the machine. Cost is tracked per doc as `{localUsd, frontierUsd, totalUsd}`.

The v2 design notes in `local-analysis.ts` are worth reading in full — clause-
boundary chunking, pre-extracted verbatim text (the small model never has to
"quote"), per-clause prompts, forced-structured concerns, a severity budget.

**Louis mapping:** on-brand for BYO-key + sovereignty (#44/#46) and our local-
Ollama setup. Rides on the existing BullMQ queue (`docs/QUEUE.md`). Can cut
frontier spend by an order of magnitude on bulk document review.

### 5. Zero-LLM grounding instead of an LLM verify pass

`src/mcp/tools/grounding-verifier.ts` (368 lines, pure regex). String-matches
every cited quote/section against the source doc → grounding score 0–1, flags
boilerplate-only citations. Replaces an expensive "check your work" call with
deterministic matching. Implements hallucination decision #8 *and* saves
credits. Self-contained — easiest single port.

### 6. Hard budget caps + real-time spend

`config.ts`: `defaultBudgetUsd`, per-doc budget, `recordSpend()` enforced live.
This is decision #87 (per-user token-cost dashboard + alert when a turn costs
> $X) already built.

### 7. Evaluator gate fails fast

`src/mcp/tools/evaluator-gate.ts` drops weak findings *before* downstream
passes spend tokens on them.

---

## Lens B — Context memory

### 1. Four-tier memory model

`src/mcp/tools/memory-system.ts`, described as *"Boris's CLAUDE.md insight
applied to law"*:

- **Session** — current run state
- **Matter** — per-document context that persists across runs
- **Institutional** (`LEGAL.md`) — cross-session lessons / rules / warnings
- **Precedent** — reusable transformation patterns

**Louis mapping:** the Supabase vault is great long-term storage but isn't
*injected as tiered working memory per turn*. A `LEGAL.md`-style note per
matter/firm, read each turn, is high-leverage and matches our two-layer memory
philosophy.

### 2. Precedent board with decay + promotion

`src/claw/precedent-board.ts` (local JSON, no LLM). Patterns reinforce on
recurrence, decay when stale, get promoted `tentative → confirmed`, and carry
an effectiveness moving average. Per-client isolated. Pairs with conflicts-graph
(#71) and partner reporting (#73). Swap its JSON persistence for Supabase.

### 3. Self-tuning feedback loop

`src/mcp/tools/feedback-loop.ts`. Memory entries track `effectiveness`,
`usageCount`, `outcomes[]`. Memory that demonstrably helped gets weighted up at
retrieval; useless memory decays. This is the cure for context bloat — inject
only the memory that has earned its place, not everything.

### 4. Tagged, filtered retrieval

Memory carries `{agentRole, engagementType, documentType, jurisdiction}` tags,
so a turn pulls only the relevant slice into context. Smaller prompts, more
signal.

### 5. Hybrid retrieval — and where Louis can beat Lavern

`src/knowledge-base/retriever.ts` uses BM25 + legal-synonym expansion + n-gram
re-rank (over-fetch 3×, then re-rank). Lavern openly admits it has **no vector
layer**. Louis already has `backend/src/embeddings/` (`index.ts`,
`retrieval.ts`, `store.ts`) — layering Cohere embeddings + rerank (#27/#28) on
this shape is strictly better than Lavern's retrieval. See `docs/EMBEDDINGS.md`.

### 6. Handoff with state transfer

`src/mcp/tools/handoff.ts` passes a compressed state object between steps
instead of re-sending the whole transcript — context-window economy across
multi-step work.

---

## Lens C — Agents

### 1. The pipeline shape

router → workflow template (registry of 9 in `src/workflows/templates/`) →
orchestrator → specialists. Louis's 972 skills are *prompt fragments*; Lavern's
**workflow templates** are typed, multi-step orchestrations with gates — the
missing layer between "skill" and "outcome." Backbone for #74/#75.

### 2. Phase-based tool permissions

`src/permissions/` — each agent only gets the MCP tools its phase allows. This
shrinks per-agent context (fewer tool defs) and reduces error surface. Even
single-LLM Louis benefits: scope tools to the detected intent.

### 3. Citation-gated debate + adversarial verification

`debate-board` MCP tool + red-team/blue-team orchestrators. **Do not** adopt the
67-agent sprawl (the author says it's too many). Adopt the *adversarial
verification on critical findings only*, as an optional "Full Bench" mode for
high-stakes review.

### 4. Human gates + YOLO mode

`src/gates/`. Decisions #25 (per-N-steps approval) and #74 (approval workflows)
already designed — this is a working implementation, including a fully-automated
auto-approve path.

### 5. Agent-native surface

`.well-known/agent.json` (A2A card) + the remote MCP bridge
(`src/mcp/remote-bridge/`) expose the system to other agents over JSON-RPC.
This is #75 (workflow API), #76 (webhooks/SSE), and #77 (MCP + plugin SDK) in
one move. Louis already has `docs/PUBLIC_API.md` to build on.

---

## Proposed "Processor v2" for Louis

Combine the cheap wins into one coherent layer on top of `route()`:

| # | Change | Lens | Impact | Effort |
|---|--------|------|--------|--------|
| 1 | Adaptive router: cheap classifier → load 1–13 skills + pick `effort` | Cost | High | M |
| 2 | Effort dial + model tiering (Sonnet router / Haiku cleanup / Opus when needed) | Cost | High | S |
| 3 | Grounding verifier (zero-LLM citation check + badge) | Cost + trust | High | S |
| 4 | Per-turn budget cap + spend tracker (#87) | Cost | Med | S |
| 5 | Hybrid local(Ollama)+frontier triage for doc review (rides BullMQ) | Cost | High | L |
| 6 | Four-tier memory + `LEGAL.md` per matter, injected per turn | Memory | High | M |
| 7 | Feedback-loop weighting so injected memory is earned, not bloated | Memory | Med | M |
| 8 | Cohere hybrid retrieval over the existing embeddings layer (#27/#28) | Memory | Med | M |
| 9 | Workflow-template layer above skills + adversarial "Full Bench" mode | Agents | Med | L |

**First slice: #1 + #2 + #4 together.** The adaptive router with effort scaling,
model tiering, and a budget cap is the highest credit-savings-per-day-of-work,
touches one subsystem (`backend/src/skills/_router.ts` + the `/chat` handler),
needs no UI rebuild, and is the foundation that #5 (hybrid triage) and #9
(workflows) plug into. **Fast-follow: #3 (grounding)** — self-contained and
doubles as the trust story.

---

## What to skip

- The 67-agent roster (the author admits it's more than needed).
- Stripe / billing (Louis removed it — #67).
- Cookie-auth / Google OAuth (Louis is on Supabase Auth).
- The slow free-form Counsel mode (5–10 min/run; adopt structured workflows).

---

_Source: `AnttiHero/lavern` @ v0.15.0, analyzed 2026-05-21. Vault note:
`20-Projects/mike-fork/lavern-inspiration.md`._
