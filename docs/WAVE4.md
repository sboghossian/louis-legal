# Wave 4 — make Wave 3 infra live (additive + flagged)

Wave 3 shipped four modules; most were dormant. Wave 4 adds the missing seams +
opt-in wiring so they're usable — **without changing the default chat/retrieval
path.** Every change is additive: existing clients behave identically.

| Capability | Module | Wiring | Default behavior |
|------------|--------|--------|------------------|
| **Ollama provider** | `lib/llm/ollama.ts` — `completeOllamaText` / `streamOllama` / `pingOllama` | `lib/llm/route.ts` `completeRouted()` (opt-in) routes low-stakes turns to local Ollama, high-stakes to frontier, with frontier fallback on local failure | Unchanged — `completeText` still the default; callers opt in |
| **A2A↔MCP task bridge** | `agent/task.ts` — `runAgentTask` + `agentTaskRouter` | Mounted: `POST /.well-known/agent/task` maps an A2A task to an MCP `tools/call` | New endpoint, additive |
| **Session checkpointing** | `sessions/checkpoint.ts` — `checkpointStart/Save/Hydrate` (owner-scoped, shallow-merge) | Helpers ready; opt-in call sites in chat/workflow | Not yet called by default |
| **Workflow progress over chat** | `workflows/events.ts` — `progressFromRun` / `toSSE` + `routes/workflowChatDispatch.ts` | `/chat` with a `workflowTemplateId` enqueues `workflows.run` and emits an initial `workflow_progress` event + the runId | Absent field → normal chat (a 3-line guard) |

## `/chat` workflow dispatch

```jsonc
// POST /chat  (auth)  — opt-in
{ "workflowTemplateId": "contract-review", "workflowInput": { "matterId": "m-7" } }
```

Emits SSE `data:` frames: a `workflow_progress` event then a `workflow_dispatched`
event with `{ runId, jobSkipped, poll: "/api/workflows/:runId" }`. The client
polls `GET /api/workflows/:runId` for status/result.

**Why poll, not stream every step:** the BullMQ worker is a separate process and
the default run store is in-memory, so the API process can't observe per-step
progress without shared state. Live per-step streaming needs the Supabase run
store (shared) + a pub/sub or polling bridge — a follow-up. The MVP is correct
and process-safe.

## Triage-routed completion (opt-in)

```ts
import { completeRouted } from "@/lib/llm/route";
const { text, route } = await completeRouted({ intensity: "quick", user: prompt });
// route.target === "local" when OLLAMA_URL is set (or probe:true pings it) and
// the turn is low-stakes; otherwise "frontier". Local failure → frontier fallback.
```

The default chat path is untouched; opt in by calling `completeRouted` instead
of `completeText`.

## Remaining follow-ups (deliberately out of scope here)

- Flip defaults: route default model selection through triage; checkpoint every
  chat turn; run retrieval through the rerank seam. (The "full live rewire"
  option — a separate reviewed change.)
- True per-token Ollama streaming (NDJSON) + Ollama tool-calling.
- Live per-step workflow progress (Supabase realtime / pub/sub).
- `pingOllama()` reachability wired into triage's availability in production.
