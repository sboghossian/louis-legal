# Louis — AI legal workbench

Louis is an open-source legal AI workbench for solo practitioners, in-house
teams, and boutique law firms. It pairs a chat assistant with a document
workspace, a redlining/comparison view, a clause/citation library, a
risk scanner, a tabular reviewer for due-diligence-style batches, and ~990
authored "skills" that bias the model toward the way actual lawyers
draft, review, and reason.

The whole stack runs on commodity infrastructure (Supabase + an
S3-compatible bucket + a model provider of your choice) and BYO API keys
mean you can run a private deployment without exposing client data to an
intermediary.

- **Frontend** — Next.js 15 (App Router), Tailwind, shadcn/ui.
- **Backend** — Express + TypeScript, Supabase admin client, AWS-S3-SDK.
- **Auth + DB** — Supabase.
- **Object storage** — Cloudflare R2 (or any S3-compatible bucket — MinIO, Wasabi, B2).
- **Model providers** — Anthropic Claude, Google Gemini, OpenAI. Pick per-message; per-user BYO keys override the server's defaults.
- **MCP server** — exposes Louis's calculators, clause/citation lookups, risk scanner, and skill router to any MCP-aware AI client.

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Next.js 15   │ ←→ │   Express +   │ ←→ │   Supabase    │
│  (frontend)   │SSE │   TypeScript  │    │  (Auth + PG)  │
└───────────────┘    └───────┬───────┘    └───────────────┘
                             │
                             ▼
                     ┌───────────────┐  ┌───────────────┐
                     │   R2 / S3     │  │ Claude/Gemini │
                     │   bucket      │  │  OpenAI APIs  │
                     └───────────────┘  └───────────────┘
```

## Repo layout

```
.
├── frontend/                 Next.js 15 app
│   └── src/app/(pages)/      One folder per top-level UI surface
├── backend/                  Express API + skills + schema
│   ├── src/routes/           One file per HTTP namespace (chat, billing, …)
│   ├── src/skills/           ~990 authored .md skills + registry
│   ├── src/lib/llm/          Provider adapters (claude/gemini/openai)
│   └── schema.sql            Idempotent schema for fresh Supabase databases
├── deploy/
│   └── cloudflared/          Cloudflare Tunnel config for legal.dashable.dev
└── docs/                     Storage setup + local testing guides
```

## Prerequisites

- Node.js 20+
- npm
- A Supabase project (free tier works)
- An S3-compatible bucket (Cloudflare R2, MinIO, etc.)
- At least one model provider API key: Anthropic, Gemini, or OpenAI
- LibreOffice (only if you need DOC/DOCX → PDF conversion)

## Quick start (local) — 10 minutes from clone to running app

Assumes you have Node 20+, npm, and Homebrew (or your platform's
equivalent for installing LibreOffice / cloudflared). You'll need
free-tier accounts for Supabase and Cloudflare R2 (or any S3-compatible
bucket: MinIO, Wasabi, Backblaze B2, Supabase Storage…).

```bash
# 1. Clone
git clone https://github.com/sboghossian/louis-legal.git
cd louis-legal

# 2. Install deps for both apps
npm install --prefix backend
npm install --prefix frontend

# 3. Create env files
touch backend/.env frontend/.env.local
#    Now open both and paste the templates from the "Environment"
#    section below; fill in the Supabase / R2 values you just minted.

# 4. Apply the schema to a fresh Supabase database
#    Open the Supabase SQL editor for your project and paste:
#      backend/schema.sql
#    Hit Run. The file is idempotent — safe to re-run.

# 5. Start both servers (two terminals, or `npm run dev` from the root
#    if you have `concurrently` installed)
npm run dev --prefix backend    # → http://localhost:3001
npm run dev --prefix frontend   # → http://localhost:3000
```

Open `http://localhost:3000`, sign up, complete onboarding (you'll see
it exactly once per account), then add an API key for at least one
model provider — either in `backend/.env` for the whole instance, or
per-user in **Account → Models & API Keys**.

### Hosted demo

A live build sits at **https://legal.dashable.dev** (Cloudflare-tunneled
from a workstation; uptime is best-effort). Use it for a tour, not for
real data.

### Common gotchas

- **Supabase confirmation email never arrives.** Disable email
  confirmation in Supabase → Authentication → Providers → Email for
  local dev, or wire your own SMTP — the built-in mailer is heavily
  rate-limited.
- **Model picker shows "missing key".** Set `ANTHROPIC_API_KEY`,
  `GEMINI_API_KEY`, or `OPENAI_API_KEY` in `backend/.env` and restart
  the backend, or just paste a key in **Account → Models & API Keys**
  (user-set keys take precedence over env keys).
- **DOC / DOCX conversion fails.** `brew install libreoffice` and
  restart the backend so `soffice` is on `PATH`.
- **Multiple lockfiles warning.** Cosmetic; ignore. `frontend/` has its
  own `package-lock.json`.

## Environment

### `backend/.env`

```bash
PORT=3001
FRONTEND_URL=http://localhost:3000           # CORS allow-list
DOWNLOAD_SIGNING_SECRET=<random 32-byte hex>

# Supabase
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SECRET_KEY=<service-role key>

# Object storage (R2 or any S3-compatible)
R2_ENDPOINT_URL=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…
R2_BUCKET_NAME=louis

# Model providers (any subset; users can also BYO at runtime)
ANTHROPIC_API_KEY=…
GEMINI_API_KEY=…
OPENAI_API_KEY=…

# AES-GCM secret used to encrypt per-user BYO keys at rest.
# Cannot be rotated without re-encrypting; generate once and keep it stable.
USER_API_KEYS_ENCRYPTION_SECRET=<long random string>

# Optional
RESEND_API_KEY=…                              # for transactional email
```

### `frontend/.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<anon key>
SUPABASE_SECRET_KEY=<service-role key>
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

> **BYO key precedence.** A user's stored API key takes precedence over
> the env key. Set `ANTHROPIC_API_KEY` etc. as fallbacks for users who
> haven't configured their own — never as overrides. Status reporting at
> `/api/api-keys/status` always reflects which key will actually be used.

## Database

For a fresh project, paste `backend/schema.sql` into the Supabase SQL editor
and run. It is idempotent (uses `create table if not exists` and `drop
policy if exists`/`create policy`) so re-running is safe.

For an existing production database, **do not** rerun the full schema;
apply only the relevant incremental migrations under `backend/migrations/`.

## Deploying

### Cloudflare Tunnel → `legal.dashable.dev`

The easiest way to expose Louis with a public TLS hostname is a Cloudflare
Tunnel. No port-forwarding, no inbound firewall change — the
`cloudflared` daemon holds an outbound HTTP/2 connection that Cloudflare
routes traffic over.

See [`deploy/cloudflared/README.md`](deploy/cloudflared/README.md) for the
full walkthrough. tl;dr:

```bash
brew install cloudflared
cloudflared tunnel login
cloudflared tunnel create louis-legal
cloudflared tunnel route dns louis-legal legal.dashable.dev
cloudflared tunnel route dns louis-legal legal-api.dashable.dev

# fill in tunnel UUID + credentials path in deploy/cloudflared/config.yml
npm run tunnel
```

This routes:

| Host                       | →   | Local port              |
| -------------------------- | --- | ----------------------- |
| `legal.dashable.dev`       | →   | `localhost:3000` (Next) |
| `legal-api.dashable.dev`   | →   | `localhost:3001` (API)  |

Don't forget to set `NEXT_PUBLIC_API_BASE_URL=https://legal-api.dashable.dev`
in `frontend/.env.local` and `FRONTEND_URL=https://legal.dashable.dev` in
`backend/.env` once you've pointed the tunnel.

### Other targets

- **Frontend** can also run as a static export on Cloudflare Pages or
  Vercel; the backend stays elsewhere (Fly.io, Railway, a small VM). The
  `frontend/open-next.config.ts` is set up for the OpenNext Cloudflare
  adapter inherited from the upstream Mike fork.
- **Backend** packs a `Dockerfile`-free `nixpacks.toml`; Railway / Coolify
  pick it up automatically.

## Major features

- **Assistant chat** with streaming responses, citations, doc reads,
  workflow turn-key actions, and per-message thumbs up/down feedback.
- **Reasoning** is surfaced by default in a collapsible block whenever the
  model exposes thinking (Claude `thinking: adaptive`, Gemini
  `includeThoughts`, OpenAI `reasoning.summary`).
- **Document workspace** with versions, accept/reject tracked-change edits,
  cross-doc diffs, and a redline export.
- **Prompt Library** (`/prompt-library`) — ~150 expert prompts ported
  from haqq.ai, filterable by use case and practice area; one click sends
  the template into the assistant composer.
- **Skill router** — Louis routes each user message through ~990 authored
  skills (drafting, review, research, jurisdiction, persona, …) and
  composes only the relevant ones into the system prompt.
- **Processor v2** (`docs/PROCESSOR_V2.md`) — three credit/trust/memory wins
  layered on the router:
  - *Adaptive cost governor* — a cheap classifier picks an intensity tier
    (`quick`/`standard`/`thorough`) that scales the skill count, model tier,
    Claude `effort`, and a per-turn budget cap; low-confidence/high-risk turns
    escalate one tier. Easy questions get cheap, fast answers.
  - *Zero-LLM grounding* — every quoted span and section reference in an
    answer is mechanically checked against the cited document (pure string
    matching, no extra model call). Surfaced on `/chat` as a trailing
    `grounding` SSE event `{ score, matched, unmatched }`.
  - *Four-tier memory* — Session / Matter / Institutional / Precedent store
    with tag-filtered retrieval and effectiveness/recency weighting, so only
    memory that has earned its place is injected.
- **Tabular review** — apply the same prompt(s) across many documents,
  one column = one question, like a due-diligence checklist.
- **MCP server** at `/api/mcp` exposes calculators, clause lookups,
  citation lookups, the risk scanner, and the skill router to any
  MCP-aware client.
- **Billing**, **team & permissions**, **inbox**, **routines** (scheduled
  agents), **GitHub skills sync**, and **integrations** (Drive/Slack/etc.)
  are all wired against real backend stores.

## Useful checks

```bash
npm run typecheck                       # both apps
npm run build --prefix backend          # compile TS + copy skills
npm run build --prefix frontend
npm run lint  --prefix frontend
```

## Troubleshooting

- **Sign-up confirmation email never arrives.** Supabase Auth sends
  these, not Louis. Easiest fix locally: disable email confirmation in
  Supabase → Authentication → Providers → Email. In production,
  configure custom SMTP (Supabase's built-in mailer is heavily
  rate-limited).
- **Model picker shows a missing-key warning.** Either add a key in
  Account → Models & API Keys, or set the provider key in `backend/.env`
  and restart the backend.
- **DOC / DOCX conversion fails.** Install LibreOffice locally and
  restart the backend so `soffice` is on `PATH`.
- **SSE chat hangs over the tunnel.** Don't put a buffering reverse
  proxy in front of `cloudflared` — it'll silently break streaming.
  `NEXT_PUBLIC_API_BASE_URL` should point at `legal-api.dashable.dev`
  directly.
- **CORS errors after deploying.** `FRONTEND_URL` in `backend/.env` must
  match the public origin exactly.

## Provenance

Forked from [willchen96/mike](https://github.com/willchen96/mike) and
rebranded as Louis for the HAQQ Legal AI vision. See `docs/` and the
session-level commit messages for the running narrative.

## License

MIT — see `LICENSE`.
