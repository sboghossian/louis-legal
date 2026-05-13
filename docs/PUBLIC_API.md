# Louis Public Developer API

Louis ships with a versioned, token-authenticated REST API for firms that
want to build internal tooling against their Louis workspace — automations,
custom dashboards, deal-room widgets, anything you'd normally build on top
of a SaaS vendor's public API.

The API is **free** to use. Louis is BYO-LLM-key: your API token authorizes
your firm's developer, the actual LLM completions bill against the
provider key (Anthropic / OpenAI / Gemini) stored in your Louis account.

- Base URL: `https://<your-louis-host>/api/v1`
- Auth: `Authorization: Bearer pk_louis_<random>`
- Envelope: every response is `{ data, error, meta }`

---

## 1. Mint an API token

Tokens are minted from your signed-in Louis session (browser cookie or
Supabase JWT). Only an authenticated Louis user can create keys against
their own account.

```bash
curl -X POST http://localhost:3001/api/v1/tokens \
  -H "Authorization: Bearer $LOUIS_SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"label":"my-laptop"}'
```

Response (the **only** time the secret is returned):

```json
{
    "data": {
        "id": "0f9c…",
        "label": "my-laptop",
        "prefix": "pk_louis_a3",
        "token": "pk_louis_a3f8…",
        "created_at": "2026-05-13T12:00:00.000Z"
    },
    "error": null,
    "meta": {
        "request_id": "…",
        "version": "v1",
        "warning": "Store this token now — it will never be shown again."
    }
}
```

Tokens are stored **hashed** (SHA-256). Louis cannot recover a lost token —
revoke it and mint a new one.

```bash
# List your tokens (no secrets)
curl http://localhost:3001/api/v1/tokens \
  -H "Authorization: Bearer $LOUIS_SUPABASE_JWT"

# Revoke
curl -X DELETE http://localhost:3001/api/v1/tokens/$TOKEN_ID \
  -H "Authorization: Bearer $LOUIS_SUPABASE_JWT"
```

> **Preview-build caveat.** Tokens currently live in an in-memory `Map` on
> the backend process. They survive request-to-request but **not** server
> restarts. Persistence to a Supabase `public_api_tokens` table is the next
> step (see TODO at the top of `backend/src/routes/public-api.ts`).

---

## 2. Chat

### `POST /api/v1/chat` — non-streaming

```bash
curl -X POST http://localhost:3001/api/v1/chat \
  -H "Authorization: Bearer $LOUIS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Summarize this NDA in 3 bullets." }
    ],
    "model": "gemini-3-flash-preview"
  }'
```

Response:

```json
{
    "data": { "model": "gemini-3-flash-preview", "content": "…" },
    "error": null,
    "meta": { "request_id": "…", "version": "v1" }
}
```

The `model` field accepts any of the canonical Louis model IDs
(`claude-opus-4-7`, `gemini-3.1-pro-preview`, `gpt-5.5`, …). Unknown IDs
fall back to the default.

### `POST /api/v1/chat/stream` — SSE streaming

Same body. Returns a long-lived `text/event-stream` with these events:

| event   | data shape                            |
| ------- | ------------------------------------- |
| `start` | `{ model, request_id }`               |
| `delta` | `{ text }` — partial completion text  |
| `done`  | `{ length }` — final total characters |
| `error` | `{ code, message }`                   |

---

## 3. Documents

### `POST /api/v1/documents` — upload + parse

```bash
curl -X POST http://localhost:3001/api/v1/documents \
  -H "Authorization: Bearer $LOUIS_API_KEY" \
  -F "file=@/path/to/contract.pdf"
```

Supports `pdf`, `docx`, `doc`, `txt`, `md`. Returns the parsed text length +
a 500-char preview, plus a one-time `id` you can use to fetch the full text:

```json
{
    "data": {
        "id": "…",
        "filename": "contract.pdf",
        "length": 12450,
        "preview": "AGREEMENT … entered into as of …"
    },
    "error": null,
    "meta": { … }
}
```

### `GET /api/v1/documents/:id` — fetch parsed text

```bash
curl http://localhost:3001/api/v1/documents/$DOC_ID \
  -H "Authorization: Bearer $LOUIS_API_KEY"
```

> Parsed docs are held in-memory only on the public API surface. For
> persistent document storage with versions, use the internal
> `POST /single-documents` route with your Supabase session.

---

## 4. Skills

Louis ships with a 982-skill library — vetted, frontmatter-typed system
prompts for legal tasks. Browse them:

```bash
# Paginated list
curl "http://localhost:3001/api/v1/skills?category=msa&limit=20" \
  -H "Authorization: Bearer $LOUIS_API_KEY"
```

Run one against arbitrary input:

```bash
curl -X POST http://localhost:3001/api/v1/skills/run \
  -H "Authorization: Bearer $LOUIS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "skill_id": "msa-redline-tier-1",
    "input": "<contract text>"
  }'
```

---

## 5. Workflows

Saved Louis workflows (the things you see in `/workflows`) are runnable too.
You must own the workflow or it must be a system workflow.

```bash
curl -X POST http://localhost:3001/api/v1/workflows/run \
  -H "Authorization: Bearer $LOUIS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "<uuid>",
    "input": "<input text>"
  }'
```

---

## 6. Webhooks via SSE — `GET /api/v1/events`

Louis inverts the usual webhook flow: instead of POSTing to a URL you host,
you hold open an SSE connection to `/api/v1/events`. That removes the need
to expose a public ingress on the firm side (huge for regulated firms) and
keeps the same per-event fan-out semantics.

```bash
curl -N http://localhost:3001/api/v1/events \
  -H "Authorization: Bearer $LOUIS_API_KEY"
```

You'll receive an opening `open` event, periodic SSE heartbeats (`:
heartbeat …`), and one event per qualifying activity:

```
event: matter.created
id: 7f1b…
data: {"type":"matter.created","id":"7f1b…","occurredAt":"2026-05-13T12:01:02.000Z","userId":"…","payload":{…}}
```

Event types:

- `matter.created`
- `matter.updated`
- `document.parsed`
- `chat.turn`
- `routine.completed`
- `workflow.gate.opened`
- `skill.fired`

---

## 7. Plug-in marketplace — `GET /api/v1/plugins`

First-party catalog of official Louis plug-ins:

```bash
curl http://localhost:3001/api/v1/plugins
```

Each manifest:

```json
{
    "id": "outlook-deadline-extractor",
    "name": "Outlook deadline-extractor",
    "description": "…",
    "icon": "Mail",
    "install_url": "https://github.com/…/install",
    "repo_url": "https://github.com/…",
    "category": "productivity",
    "author": "Louis team",
    "version": "0.1.0",
    "verified": true
}
```

The marketplace UI lives at `/plugins` in the frontend.

---

## End-to-end quick start

```bash
# 1. Mint a key (requires you're already signed in to Louis)
export LOUIS_API_KEY=$(curl -s -X POST http://localhost:3001/api/v1/tokens \
  -H "Authorization: Bearer $LOUIS_SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"label":"smoke-test"}' | jq -r .data.token)

# 2. Use it
curl -X POST http://localhost:3001/api/v1/chat \
  -H "Authorization: Bearer $LOUIS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello Louis"}]}'
```

## Error codes

| HTTP | code                  | meaning                                  |
| ---- | --------------------- | ---------------------------------------- |
| 400  | `invalid_body`        | malformed JSON / missing required fields |
| 400  | `unsupported_type`    | document extension not supported         |
| 401  | `missing_token`       | no Authorization header                  |
| 401  | `invalid_token`       | unknown / revoked token                  |
| 401  | `invalid_token_prefix`| token missing `pk_louis_` prefix         |
| 403  | `forbidden`           | resource not owned by token's user       |
| 404  | `not_found`           | resource id not found                    |
| 502  | `llm_error`           | provider call failed                     |

## SDK

A TypeScript SDK is scaffolded at `backend/sdk/` (`@louis/sdk`). See its
[README](../backend/sdk/README.md).
