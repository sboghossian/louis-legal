# Wave 2 — Multi-agent orchestration (Lavern-inspired)

Branch base: `main` · integration branch `feat/lavern-wave2` · Source study: `/tmp/lavern`

## Resolved architecture (grill-me 2026-05-22)

1. **Execution = one engine, two triggers.** Orchestrator core runs as a BullMQ
   `workflows.run` job (never in the SSE turn). Dispatchable from `/chat`
   (streams `workflow_progress` events) AND directly via API / Drafting Board.
2. **Templates = typed TS registry** (`backend/src/workflows/templates/`). 3 seed
   templates (Contract Review, Due Diligence, Research Memo). User-authoring deferred.
3. **Steps reuse Processor v2 primitives** — no second model stack. Each step:
   `routeAsync` (skills) → `buildMemoryContext` (memory) → cost governor
   (model/effort) → `verifyGrounding` on doc-citing output. Steps emit
   severity-tagged structured findings.
4. **Full-Bench = bounded adversarial verify**, RED findings only, max 3/run,
   3 prompt-roles (Challenger → Defender → Evaluator → verdict upheld/revised/withdrawn).
5. **Run store + mandatory gates.** `WorkflowRunStore` (interface + in-memory +
   Supabase, env-gated — mirrors the memory store) + `workflow_runs` migration
   (per-user RLS). Lifecycle `queued→running→(gated→running)*→assembling→done|failed`.
   Side-effect steps MUST be `gate:true`; run pauses, resumes only on
   `POST /api/workflows/:runId/approve` (encodes the /lecun-world-model stance).

## ADRs (hard-to-reverse — write up after build)
- Workflows run as BullMQ jobs, not in `/chat`.
- Orchestrator reuses Processor v2 primitives (no parallel model stack).
- Mandatory human gates on side-effect steps.
- Templates as typed TS registry (v1).

## Dependency-ordered slices

### Slice 2a — Foundation: types + template registry + run store  (do FIRST, solo)
- `workflows/types.ts`: `WorkflowTemplate`, `WorkflowStep` (intent, skillHint,
  modelTier, `gate?`, `sideEffect?`), `WorkflowRun`, `Finding` (severity), `RunStatus`.
- `workflows/templates/` — 3 seed templates + `registry.ts` (`getTemplate(id)`, `listTemplates()`).
- `workflows/runStore.ts` interface + `InMemoryRunStore` + `SupabaseRunStore` +
  `createRunStore()` factory + migration `2026-05-22-workflow-runs.sql`.
- **AC:** registry returns valid typed templates; run store CRUD + status
  transitions + per-user isolation + factory env-gating; pure mappers tested.
  typecheck 0, vitest green.

### Slice 2b — Orchestrator engine + BullMQ job + gates  (after 2a)
- `workflows/orchestrator.ts`: `runWorkflow(template, ctx, deps)` where deps
  (router, memory, llm, grounding, store) are INJECTED for testability. Sequences
  steps, writes findings, pauses at gate/side-effect steps.
- `queue/jobs/workflows.run.ts` (wraps orchestrator) + register in worker.
- `POST /api/workflows` (start→enqueue), `GET /api/workflows/:runId`,
  `POST /api/workflows/:runId/approve` (resume gate).
- **AC:** fake template + fake llm → findings produced; gate step → status
  `gated`, resume continues; per-step model/effort from governor; fail-safe.
  typecheck 0, vitest green.

### Slice 2c — Full-Bench (after 2a types; parallel-safe with 2d/2e cores)
- `workflows/fullBench.ts`: `runFullBench(redFindings, llm, {cap=3})` → verdicts.
  Wire into orchestrator post-step (RED only, behind template/run flag).
- **AC:** RED finding → Challenger/Defender/Evaluator → verdict+confidence;
  non-RED skipped; cap respected. vitest green.

### Slice 2d — Assembly + validation + fidelity (after 2a types; parallel-safe)
- `workflows/assembly/`: `assembleDeliverable(run, llm)`, `validateDeliverable`
  (reject skeleton/placeholder/process-dump, min substance — port Lavern's
  hard-won checks), `verifyFidelity(run, doc, llm?)` (mechanical RED-coverage +
  cheap spot-check). Final orchestrator phase.
- **AC:** validate rejects skeleton/placeholder/process-dump, accepts a real doc;
  fidelity mechanical check; assembler with fake llm. vitest green.

### Slice 2e — Derivatives registry + API (after 2a/2d; parallel-safe core)
- `workflows/derivatives/`: typed registry (client-letter, summary, redline, memo)
  = prompt + context-builder from a completed run. `POST /api/workflows/:runId/derivatives/:type`.
- **AC:** registry builds context from a run; route validates; fake-llm test. vitest green.

### Integration + ship
- Wire 2c/2d/2e into the orchestrator; optional `/chat` dispatch trigger (may be
  follow-up). Full backend typecheck 0, vitest green, `npm run build` 0.
- Docs (`docs/WORKFLOWS.md` + README + `docs/ARCHITECTURE.md`). PR to main, green CI.
- Frontend (Drafting Board wiring to the real engine) = explicit follow-up.

## Build approach
2a solo → then 2b (spine) with 2c/2d/2e cores buildable in parallel agents
(disjoint dirs, worktrees + symlinked node_modules) → I wire + integrate + ship.

## Status
- [x] tayyeb received → **Slice 2a SHIPPED** (`feat/lavern-wave2`): `workflows/`
  types + 3 seed templates + registry (`getTemplate`/`listTemplates`/
  `validateTemplate`) + `WorkflowRunStore` (InMemory + Supabase, env-gated
  factory) + `2026-05-22-workflow-runs.sql`. Reuses `ModelTier`; no LLM/network.
  typecheck 0; +30 vitest (259 total green). AC met.
- [ ] Slice 2b — orchestrator engine + BullMQ job + gates (NEXT)
- [ ] Slices 2c / 2d / 2e — parallel-safe cores after 2b spine
- [ ] Integration + ship → then Wave 3
