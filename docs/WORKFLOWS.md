# Workflow orchestration (Wave 2)

Typed, multi-step legal workflows that run **outside** the chat turn, reuse the
Processor v2 primitives, and pause for a human before any side effect. Built on
the study of `AnttiHero/lavern` (Apache-2.0); reshaped into Louis's stack.

## Architecture decisions (ADRs)

1. **One engine, two triggers.** The orchestrator runs as a BullMQ
   `workflows.run` job, never inside the `/chat` SSE turn. It is dispatchable
   from the API today and from `/chat` / the Drafting Board later.
2. **Templates are a typed TS registry** (`backend/src/workflows/templates/`).
   Three seed templates ship; user-authoring is deferred.
3. **Steps reuse Processor v2** — the router, four-tier memory, the cost
   governor, and the zero-LLM grounding verifier. There is no second model
   stack: a step's `modelTier` feeds the same governor the chat turn uses.
4. **Bounded Full-Bench.** RED findings (only) get an adversarial
   Challenger → Defender → Evaluator pass, capped at 3 per run.
5. **Mandatory human gates.** A step with a real-world side effect must be
   gated; the run pauses (`gated`) and resumes only on explicit approval. This
   encodes the `/lecun-world-model` stance: no autonomous multi-step action
   without a human in the loop.

## Run lifecycle

```
queued → running → (gated → running)* → assembling → done
              └──────────────┴──────────────┴────────→ failed
```

The engine is **resumable**: it continues from the run's persisted
`currentStepIndex`. A gated step pauses the run *before* execution; approval
re-enqueues the same job, which resumes into that step.

Per step: **route** (skill hint → router) → **memory** (earned context block) →
**cost governor** (tier → model) → **llm** → **grounding** check on doc-citing
output. Steps emit severity-tagged `Finding`s (`RED` / `YELLOW` / `GREEN`)
parsed from a tagged-line convention (`[RED] Title :: detail`).

The final phase runs **Full-Bench** (revise/withdraw RED findings) →
**assembly** (build the deliverable) → **validation** (reject skeleton /
placeholder / process-dump / thin output) → **fidelity** (RED-coverage gate).

## Slices

| Slice | Module | What it provides |
|-------|--------|------------------|
| 2a | `workflows/types.ts`, `templates/`, `runStore.ts`, `supabaseRunStore.ts`, `factory.ts` | Types, the seed template registry (`getTemplate`/`listTemplates`/`validateTemplate`), and the persistence-agnostic run store (in-memory ⇄ Supabase, env-gated) mirroring the memory store. |
| 2b | `workflows/orchestrator.ts`, `queue/jobs/workflows.run.ts`, `routes/workflowRuns.ts` | The engine (`runWorkflow`, injected deps), the BullMQ job, and the gated API. |
| 2c | `workflows/fullBench.ts` | `runFullBench` — bounded adversarial verification of RED findings. |
| 2d | `workflows/assembly/` | `assembleDeliverable`, `validateDeliverable`, `verifyFidelity`. |
| 2e | `workflows/derivatives/` | Typed registry of run→document transforms (client-letter / summary / redline / memo). |

## Seed templates

- **Contract Review** — parties → key terms → risk flags → compliance → summary.
- **Due Diligence** — inventory → issue spotting → red-flag escalation → report.
- **Research Memo** — frame → authority → analysis → memo.

All three are read-only/analytical, so none carry gates. Gates apply when a
template includes a side-effect step (`validateTemplate` enforces
`sideEffect ⇒ gate`).

## API (`/api/workflows`, auth required)

| Method & path | Purpose |
|---------------|---------|
| `GET  /api/workflows/templates` | List seed templates. |
| `POST /api/workflows` | Start a run `{ templateId, input? }` → `202` + run + job. |
| `GET  /api/workflows` | List the caller's runs (newest first). |
| `GET  /api/workflows/:runId` | Run status (owner-scoped). |
| `POST /api/workflows/:runId/approve` | Approve a `gated` run → resumes it. |
| `POST /api/workflows/:runId/derivatives/:type` | Generate a derivative from a completed run. |

Distinct from the legacy `/workflows` prompt-row router.

## Persistence

Runs persist to Supabase (`workflow_runs`, per-user RLS) when `SUPABASE_URL` +
`SUPABASE_SECRET_KEY` are set; otherwise an in-process store is used (dev /
self-host). Apply `backend/migrations/2026-05-22-workflow-runs.sql` before
enabling the Supabase path.

## Testing

The engine and every core are unit-tested with **injected fakes** — no LLM, no
network. `runWorkflow` is exercised for the happy path, per-step model
selection, grounding annotation, the gate pause/resume loop, Full-Bench verdict
application, validation rejection, fidelity gating, and fail-safe error capture.
