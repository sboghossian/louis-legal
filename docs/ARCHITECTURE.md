# Architecture

How the running pieces fit together. Pair this with `README.md` (the
"how do I run this" guide) and `docs/STORAGE_SETUP.md` (the "where do
files live" guide).

## Process layout

```
┌───────────────────────┐
│ Next.js (frontend)    │  Renders the UI, handles auth via the
│ port 3000             │  Supabase JS client, talks to the backend
└──────────┬────────────┘  over HTTPS + EventSource.
           │  SSE for /chat
           │  REST for everything else
           ▼
┌───────────────────────┐
│ Express (backend)     │  REST + SSE. Single process. Routes are
│ port 3001             │  organised one file per HTTP namespace
└────┬──────┬───────┬───┘  under backend/src/routes/.
     │      │       │
     ▼      ▼       ▼
   Supabase  R2/S3   Model providers
   (Auth +   bucket  (Anthropic / Gemini / OpenAI)
   Postgres)
```

There is no separate worker process. Long-running operations (tabular
batch generation, doc tracked-change resolves, SSE chats) run on the same
Express process. If you grow past a single host, split tabular and
matters routines off first; the rest can stay on one box.

## Auth

- Supabase Auth issues a JWT to the browser.
- The frontend sends `Authorization: Bearer <jwt>` to every backend
  endpoint via `apiRequest` in `frontend/src/app/lib/louisApi.ts`.
- `backend/src/middleware/auth.ts` verifies the JWT against Supabase
  using the service-role key, then populates `res.locals.userId` and
  `res.locals.userEmail`.
- RLS in Postgres enforces per-user / per-project access. The backend
  uses the service-role key, but checks `userId` from JWT before every
  privileged read/write — RLS is the second wall, not the only one.

## The chat flow (SSE)

`POST /chat` is a single SSE endpoint that streams:

```
data: {"type":"chat_id","chatId":"..."}       ← first frame, lets the
                                                client jump to the
                                                permanent URL
data: {"type":"reasoning_delta","text":"..."} ← provider-side thinking
data: {"type":"content","delta":"..."}        ← model prose
data: {"type":"tool_call_start","name":"..."} ← about to run a tool
data: {"type":"doc_read","filename":"..."}    ← tool-result events
data: {"type":"doc_created", …}
data: {"type":"grounding","score":0.83, …}    ← trailing zero-LLM
                                                citation check (AC2)
…
data: [DONE]
```

Pipeline:

1. `routes/chat.ts` validates, looks up / creates the chat row, fetches
   user docs the message references, and persists the user message.
2. `routes/chat.ts` runs the **skill router**
   (`backend/src/skills/_router.ts`) which selects relevant skills from
   the ~990 authored markdown files and composes a system-prompt
   extension. The **Processor v2 cost governor** (`lib/llm/effort.ts`)
   picks an intensity tier here — scaling the skill count, model tier,
   and Claude `effort`, under a per-turn budget cap. See
   [`PROCESSOR_V2.md`](./PROCESSOR_V2.md).
3. `lib/chatTools.ts → runLLMStream` calls `lib/llm/index.ts` which
   dispatches to the provider adapter (`claude.ts`, `gemini.ts`,
   `openai.ts`). All three adapters speak the same `streamChatWithTools`
   shape and translate to their native APIs internally.
4. Each adapter forwards reasoning, content, and tool calls back through
   normalized callbacks. `runLLMStream` translates those into SSE
   events, and also accumulates an `events[]` array.
5. When the turn ends, the assistant message is persisted with its
   events as JSON in `chat_messages.content`. The frontend later
   re-hydrates statuses (edit accept/reject) at load time.
6. A fail-safe trailing block runs the **zero-LLM grounding verifier**
   (`backend/src/grounding/`) over the answer against the documents it
   cited, emitting a `grounding` SSE event. It runs after the reply, in
   its own try/catch, so it can never delay or break a successful turn.

## BYO API keys

`backend/src/lib/userApiKeys.ts` is the source of truth for which key
goes to which provider call:

- **User-supplied keys win.** Server env keys (`ANTHROPIC_API_KEY` etc.)
  are fallbacks for users who haven't configured their own.
- Keys are AES-256-GCM-encrypted at rest under
  `USER_API_KEYS_ENCRYPTION_SECRET`. Rotation requires re-encrypting
  every row.
- The status endpoint `/api/api-keys/status` reports `source: "user"`
  vs `"env"` per provider so the UI can mark a slot as read-only when
  the server already has a fallback.

## Skills

- ~990 markdown files under `backend/src/skills/`, each with YAML
  frontmatter (`id`, `category`, `intent`, `practice_area`,
  `jurisdictions`, …).
- `_loader.ts` reads them on first call and caches in memory.
- `_REGISTRY.json` is a checked-in snapshot used as a fast preview
  (the home page composer reads from `/api/skills?category=prompt-pack`
  to populate its suggestions; the Prompt Library page at
  `/prompt-library` reads `/api/skills/prompt-library` for enriched
  entries).
- `_router.ts` runs a cheap classifier (regex/keyword + optional LLM
  pass) to choose which skill IDs to inject into the system prompt for
  any given user message.

## Documents & versions

- `documents` rows are the logical document; `document_versions` rows
  are the actual bytes (one row per version), referenced by R2 key.
- `document_edits` rows are pending tracked changes. Accepting one
  promotes the patch into a new `document_versions` row.
- Downloads go through `routes/downloads.ts` which signs a short-lived
  token (HMAC over the version id + expiry) — the URL is what the
  assistant returns in `doc_created` SSE events.

## Tabular review

A `tabular_reviews` row is the matrix definition (rows = documents,
columns = prompts). `tabular_cells` are the per-cell answers. The
generation endpoint streams cell-by-cell so the UI can fill the grid
incrementally; the SSE shape mirrors chat (one stream per cell).

## MCP server

`routes/mcp.ts` implements the Model Context Protocol over HTTP+SSE. It
re-uses the same internal calculators, clause/citation libraries, risk
scanner, and skill router — there is no second implementation. A
remote MCP client (Claude Desktop, Cursor, etc.) sees Louis's tools
exactly as the chat does.

## Migrations

`backend/schema.sql` is the canonical idempotent schema. It uses `create
table if not exists` + `drop policy if exists` so running it again on
the same database is safe.

For an *existing* production database, **do not** rerun the full schema;
apply only the incremental files in `backend/migrations/`. The
checked-in schema.sql collapses everything into one runnable file for
new deployments.
