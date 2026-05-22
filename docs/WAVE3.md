# Wave 3 — agent-native infrastructure

Four parallelizable infra modules. All are **built and tested**; the table notes
how far each is wired into the live request path. Threading the partially-wired
modules into chat/retrieval is a deliberate follow-up — they ship as importable,
tested seams rather than risking the working chat path in one push.

| Module | File(s) | Status |
|--------|---------|--------|
| **Agent card** | `backend/src/agent/` | **Live.** `GET /.well-known/agent.json` is mounted — an A2A-style card advertising Louis's real endpoints (chat, documents, workflows, `/api/mcp`). |
| **Hybrid triage** | `backend/src/lib/llm/triage.ts` | **Module landed.** `decideModelRoute({ intensity, localAvailable })` routes low-stakes turns to a local Ollama model and high-stakes turns to frontier. Wiring needs an Ollama provider adapter + a reachability probe (follow-ups). |
| **Cohere rerank** | `backend/src/embeddings/rerank.ts` | **Module landed.** `rerank(query, candidates, { topN })` with graceful identity fallback when no `COHERE_API_KEY`. `retrieval.ts` already calls Cohere rerank directly; unifying onto this seam (for the fallback + injectable client) is optional. |
| **Durable sessions** | `backend/src/sessions/` | **Module landed + migration.** `SessionStore` (in-memory ⇄ Supabase, env-gated) + `hydrate()`. Apply `backend/migrations/2026-05-22-sessions.sql`; wiring into chat/workflow checkpointing is a follow-up. Archive tiering (cold-storage rehydrate) is documented in `sessions/hydrate.ts`. |

## Open follow-ups

**Wave 4 (`docs/WAVE4.md`) addressed most of these:** the Ollama provider adapter
+ `pingOllama` probe, the A2A↔MCP task bridge (mounted), session checkpoint
helpers, and the `/chat` workflow dispatch all landed (additive/opt-in). What
remains:

- Flip defaults so the live chat path uses triage / checkpoints / rerank by
  default (the "full live rewire" — a separate reviewed change).
- True per-token Ollama streaming (NDJSON) + Ollama tool-calling.
- Live per-step workflow progress over chat (Supabase realtime / pub/sub).
