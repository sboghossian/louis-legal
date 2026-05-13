# @louis/sdk

Official TypeScript / JavaScript SDK for the **Louis Legal AI** public API.

Louis is the open-source legal workbench from HAQQ Inc. It's 100% free,
**bring-your-own-LLM-key** — the SDK authorizes your firm's developer, the
chat completions bill against the LLM key you've already stored in your
Louis account.

## Install

```bash
npm install @louis/sdk
```

## Mint an API token

Tokens are issued from your signed-in Louis session (browser or `supabase-js`)
because only an authenticated Louis user can mint keys against their account.

```bash
curl -X POST https://louis.example.com/api/v1/tokens \
  -H "Authorization: Bearer <YOUR_SUPABASE_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"label":"my-laptop"}'
```

The response includes the only copy of the secret you'll ever get:

```json
{
    "data": {
        "id": "…",
        "label": "my-laptop",
        "prefix": "pk_louis_a3",
        "token": "pk_louis_a3f8…<64 hex chars>",
        "created_at": "2026-05-13T12:00:00.000Z"
    },
    "error": null,
    "meta": { "warning": "Store this token now — it will never be shown again." }
}
```

Store the `token` in your secret manager — Louis stores only a SHA-256 hash.

## Quick start

```ts
import { LouisClient } from "@louis/sdk";

const louis = new LouisClient({
    apiKey: process.env.LOUIS_API_KEY!, // pk_louis_…
    baseUrl: "https://louis.example.com",
});

// 1. Non-streaming chat
const reply = await louis.chat.complete({
    messages: [
        { role: "user", content: "Summarize this NDA in 3 bullets" },
    ],
});
console.log(reply.content);

// 2. Run a single skill
const out = await louis.skills.run({
    skill_id: "msa-redline-tier-1",
    input: "<contract text>",
});

// 3. Parse a document
const doc = await louis.documents.upload({
    filename: "contract.pdf",
    bytes: await fs.readFile("contract.pdf"),
});
console.log(doc.preview);

// 4. Tail the SSE event stream — fires for matters, documents, chats, etc.
for await (const event of louis.events.stream()) {
    console.log(event.type, event.payload);
    if (event.type === "matter.created") break;
}
```

## API surface

| Method                              | What it does                              |
| ----------------------------------- | ----------------------------------------- |
| `louis.chat.complete(req)`          | POST /api/v1/chat (non-streaming)         |
| `louis.chat.stream(req)`            | POST /api/v1/chat/stream (SSE async-iter) |
| `louis.documents.upload(req)`       | POST /api/v1/documents (multipart)        |
| `louis.documents.get(id)`           | GET /api/v1/documents/:id                 |
| `louis.skills.list({…})`            | GET /api/v1/skills                        |
| `louis.skills.run(req)`             | POST /api/v1/skills/run                   |
| `louis.workflows.run(req)`          | POST /api/v1/workflows/run                |
| `louis.events.stream()`             | GET /api/v1/events (SSE)                  |
| `louis.plugins.list()`              | GET /api/v1/plugins                       |

All responses use the consistent envelope `{ data, error, meta }`. The SDK
unwraps `data` for you and throws on `error`.

## Errors

```ts
import { LouisApiError } from "@louis/sdk";

try {
    await louis.chat.complete({ messages: [{ role: "user", content: "" }] });
} catch (err) {
    if (err instanceof LouisApiError) {
        console.error(err.code, err.message, err.status);
    }
}
```

## Local development

```bash
git clone https://github.com/sboghossian/louis-legal.git
cd louis-legal/backend/sdk
npm install
npm run build
```

## License

AGPL-3.0-only — same as Louis itself.
