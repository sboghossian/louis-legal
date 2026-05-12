"use client";

import { useState } from "react";
import { BookOpen, Search, Zap, FileText, Briefcase, ShieldAlert, Quote, Calculator, Workflow, Sparkles, Wrench, Plug, Key, Repeat, Gift, Settings as SettingsIcon, BookA, Network, Code, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface DocEntry {
    slug: string;
    title: string;
    category: "getting-started" | "features" | "infrastructure" | "settings" | "developers";
    icon: React.ComponentType<{ className?: string }>;
    summary: string;
    body: string;
    related?: string[];
}

const DOCS: DocEntry[] = [
    {
        slug: "quickstart",
        title: "Quickstart — 5-minute tour",
        category: "getting-started",
        icon: Zap,
        summary: "The fastest path from signup to your first useful Louis output.",
        body: `
**1. Onboarding (you may have done this already)**
On first sign-in, Louis asks 6 questions to tune the skill router for your role + jurisdictions + practice areas. Skip if you want — you can update later in Settings.

**2. Try the Assistant**
Go to **/assistant**. Type any legal question. Watch the skill badges appear in the side rail — these show which of Louis's 982 skills fired for your turn (transparent routing).

**3. Upload a contract**
Drop a PDF or DOCX into a chat. Louis runs OCR if needed, extracts structure, and offers per-clause actions: redline, summarize, risk-scan, translate.

**4. Open a real tool**
- **EOS Calculator** (/calculators/eos) — statutory gratuity for 6 GCC jurisdictions
- **Clause Library** (/clauses) — vetted clauses with side-by-side compare
- **Risk Scanner** (/risk) — paste a contract, get 30+ red-flag findings
- **Citations** (/citations) — format any source in 9 styles (Bluebook / OSCOLA / DIFC / etc)

**5. Connect what you use**
Settings → Integrations: OpenClaw, MS Word, Google Workspace, GitHub, MCP servers, Westlaw, LexisNexis, and 30+ more.
`,
        related: ["assistant", "skills-library", "integrations"],
    },
    {
        slug: "assistant",
        title: "Assistant — chat with documents",
        category: "features",
        icon: BookA,
        summary: "Chat-first interface to all of Louis's capabilities. Slash commands, doc upload, skill transparency.",
        body: `
The Assistant is the central chat surface. It uses Louis's skill router to pick 8-13 of the 982 skills per turn based on your message + active matter + jurisdiction context.

**Key features**
- **Slash commands**: type \`/\` to get a menu (/draft, /review, /research, /translate, /calc, /summarize, /demo, /help).
- **Prompt library**: surface 152 curated prompts from the Home composer.
- **Skill transparency**: side rail shows which skills fired for each turn — click to see the underlying system prompt.
- **Document upload**: drop a PDF/DOCX/image and ask questions about it. Louis runs OCR if needed.
- **Follow-up chips**: after each assistant message, Louis suggests next actions ("Draft a counter-proposal", "Translate to Arabic", etc).

**Pro tips**
- Tag a matter at the top of the chat to bind context — every reply becomes matter-aware.
- Type **/demo** to open the Acme x Globex MSA demo workspace.
- ⌘↩ to send.
`,
        related: ["skills-library", "doc-workspace", "matters"],
    },
    {
        slug: "doc-workspace",
        title: "Doc Workspace",
        category: "features",
        icon: FileText,
        summary: "Per-document editor with versioning, suggestions, comments, side-by-side compare.",
        body: `
Open any document from chat → "Open in workspace". Louis treats documents as ASTs — each clause has an anchor so suggestions and comments are stable across edits.

**What works**
- Version history (every edit saves)
- Track-changes-style suggestions from Louis
- Per-clause comments
- Side-by-side v1 vs v2 compare
- Export to DOCX / PDF / markdown
- Send to drafting board for agentic processing
`,
        related: ["assistant", "drafting-board", "risk-scanner"],
    },
    {
        slug: "skills-library",
        title: "Skills library + custom skills",
        category: "features",
        icon: Sparkles,
        summary: "982 skills shipped. Add your own. Export / import. See the skill router decision log.",
        body: `
Each skill is a markdown file with YAML frontmatter:
\`\`\`
---
id: review.governing-law-conflict
category: review
intent: [review, conflict-of-laws]
jurisdictions: [__multi__]
priority: P1
status: drafted
---
Skill: review — governing-law + forum conflict check.
...body...
\`\`\`

**At /skills you can**
- Filter by category, status, priority
- View any skill's full system prompt
- Test the router live (paste a message, see which skills fire)
- See the last 200 routing decisions (observability tab)
- **Create a custom skill** (click "New skill" → form)
- Edit / delete custom skills (built-ins are read-only by default)

**Skills compose**: the router picks N skills per turn and concatenates their bodies into the system prompt. Avg system prompt = 10-18k chars.
`,
        related: ["new-skill", "skill-router", "developers-api"],
    },
    {
        slug: "clauses",
        title: "Clause Library",
        category: "features",
        icon: BookOpen,
        summary: "Vetted clauses with jurisdiction-aware variants, drafting notes, risk flags, side-by-side compare.",
        body: `
30+ clauses across governing-law, dispute-resolution, limitation-of-liability, indemnity, confidentiality, IP, non-compete, force majeure, data protection, sanctions, anti-bribery.

**Filters**: category, jurisdiction (DIFC/ADGM/UAE/KSA/LB/UK/NY/FR/EU/multi), language (en/ar/fr), position (neutral/party-A/party-B).

**Compare mode**: open any clause, click the swap icon next to an alternate → side-by-side view. Useful for negotiation strategy.

Every clause has:
- Drafting notes (when to use)
- Risk flags (what can go wrong)
- Alternates (softer/harder variants)
`,
        related: ["risk-scanner", "drafting-board"],
    },
    {
        slug: "matters",
        title: "Matter Management",
        category: "infrastructure",
        icon: Briefcase,
        summary: "Open matters with parties, conflict-check, events timeline, status tracking.",
        body: `
Matters are the core unit of legal work. Each matter has:
- Parties with roles (client / counterparty / co-defendant / witness / expert / regulator / co-plaintiff / third-party)
- Practice area + jurisdictions
- Status (open / on-hold / closed / withdrawn)
- Events log (notes, deadlines, filings, communications, conflict checks)
- Budget (amount + currency)

**Conflict check**: when opening a matter, run prospective parties against existing matters. Fuzzy name match + role-opposing detection.

**e-Firm view**: /efirm gives partner-level KPIs over all matters (budget pipeline, active count, on-hold, total).
`,
        related: ["efirm", "conflict-check"],
    },
    {
        slug: "citations",
        title: "Citation Engine",
        category: "infrastructure",
        icon: Quote,
        summary: "Format any source in 9 styles: Bluebook, OSCOLA, DIFC, ADGM, KSA, UAE, Lebanon, French (Dalloz), EU ECLI.",
        body: `
Enter a case / statute / regulation / treaty / secondary source once. Louis renders it in every supported style at once — useful for cross-jurisdiction memos.

**Auto-detect**: paste a raw citation, Louis guesses the style. Then convert to your target.

**Coverage**
- Bluebook (US)
- OSCOLA (UK / Commonwealth)
- DIFC Practice Direction
- ADGM Citation Style
- KSA Official Gazette
- UAE Federal Gazette
- Lebanon Gazette
- French Dalloz / JurisClasseur
- EU ECLI

Pair with **research.precedent-finder** and **research.regulation-lookup** skills for end-to-end research-to-citation flow.
`,
    },
    {
        slug: "risk-scanner",
        title: "Risk Scanner",
        category: "infrastructure",
        icon: ShieldAlert,
        summary: "30+ rule-based contract red-flag detection. P0–P3 severity + 0-100 risk score + linked-clause fixes.",
        body: `
Paste a contract — Louis scans for known risky patterns and missing protections across:
- Liability (caps, carve-outs, consequential damages)
- Indemnity (scope, caps, broad hold-harmless)
- Termination (unilateral, cure periods)
- IP (assignment language, moral rights)
- Data protection (DPA presence, cross-border mechanism)
- Confidentiality (presence + exceptions)
- Non-compete (geographic + temporal bounds)
- Warranties (sweeping disclaimers, absolute language)
- Payment (currency traps, late fees)
- Force majeure (presence, pandemic carve-in)
- Dispute resolution (presence, law/forum mismatch)
- Sanctions + anti-bribery
- Drafting quality (TBD placeholders, cross-refs)
- Execution (signature block)
- Missing clauses (assignment, notices, entire agreement)

Each finding links to the relevant clause in the library — one click to apply the fix.
`,
        related: ["clauses", "doc-workspace"],
    },
    {
        slug: "eos-calculator",
        title: "EOS Calculator",
        category: "infrastructure",
        icon: Calculator,
        summary: "Statutory end-of-service gratuity for UAE, KSA, Bahrain, Qatar, Oman, Kuwait.",
        body: `
Each jurisdiction has its own formula. Louis encodes them with citations:
- **UAE** (FDL 33/2021 Art. 51): 21 days/year first 5 + 30 days/year beyond, capped at 2 years total
- **KSA** (Labor Law Art. 84-87): ½ month/year first 5 + 1 month/year beyond, resignation factor applies
- **Bahrain** (Law 36/2012 Art. 116): ½ month first 3 + 1 month beyond
- **Qatar** (Law 14/2004 Art. 54): 3 weeks/year minimum
- **Oman** (RD 35/2003): 15 days first 3 + 1 month beyond
- **Kuwait** (Law 6/2010 Art. 51): 15 days first 5 + 1 month beyond, cap at 1.5 years

Inputs: monthly basic salary + service duration (years/months/days) + termination basis. Output: gratuity + breakdown + caveats + citations.
`,
    },
    {
        slug: "legal-flows",
        title: "Legal Flows",
        category: "infrastructure",
        icon: Workflow,
        summary: "Multi-step legal playbooks: MSA negotiation, employment termination, TM filing, litigation defense, GDPR/PDPL readiness.",
        body: `
5 templates shipped. Each is a step-by-step recipe with:
- Skills + tools invoked per step
- Inputs required from user
- Outputs produced
- Human review gates (when partner approval is required)
- Decision branches

Run a flow → tracks step history, pauses for review, lets you resume / pause / abandon. Useful for repeatable matter types where checklist > free-form chat.
`,
        related: ["drafting-board", "matters"],
    },
    {
        slug: "drafting-board",
        title: "Drafting Board",
        category: "features",
        icon: Network,
        summary: "Visual workspace for agentic legal workflows. Nodes for each deliverable; gates pause for human approval.",
        body: `
A canvas view of matter work-in-progress. Each node is a deliverable (term sheet draft, redline, risk memo, etc.) and each arrow is a dependency. Gates pause execution for partner approval.

**Run agent**: clicks the skill router live, surfaces which skills fired, advances the simulation.

Pair with /legal-flows for structured runs and /matters for context binding.
`,
    },
    {
        slug: "routines",
        title: "Routines — scheduled AI tasks",
        category: "features",
        icon: Repeat,
        summary: "Daily / weekly digests, alerts, newsletters, deadline sweeps. Cron-scheduled, channeled to email / Slack / in-app.",
        body: `
Examples that ship:
- Daily regulatory digest (MENA gazettes)
- Friday newsletter (in-house counsel)
- Sanctions watch on counterparties
- Weekly deadline sweep

**Create your own**: title + prompt + cron schedule + output channel. Run-now triggers an immediate execution. Run history shows past outputs.
`,
    },
    {
        slug: "referral",
        title: "Referral program",
        category: "features",
        icon: Gift,
        summary: "Two programs: Consumer AI (credits per signup) and e-Firm (free months per firm).",
        body: `
Auto-generates your unique referral code on first visit. Send invites by email or LinkedIn. Track stage progression: clicked → signed-up → converted → reward.

Earn $20-100 per conversion (Consumer AI) and free months (e-Firm). Configurable in admin.
`,
    },
    {
        slug: "api-keys",
        title: "Bring your own API keys",
        category: "settings",
        icon: Key,
        summary: "Drop in your Anthropic / OpenAI / Gemini key and every turn runs through it. Your key always wins over the server's.",
        body: `
Open **Settings → Models & API Keys** (or **/settings/api-keys**). Paste a key for any of: Anthropic, Google Gemini, OpenAI. Louis stores it AES-256-GCM encrypted with a server-side secret.

**Precedence (important)**: your stored key always takes precedence over any key the server has in its env. The status panel labels each provider as either \`user\` (your key) or \`env\` (server fallback) so you can see exactly which key will run the next turn.

**Cost transparency**: your tokens, your bill — you see exactly what each turn costs in your provider dashboard.

**What's used where**:
- Main chat at /assistant uses the per-message model picker (Claude Opus / Sonnet, Gemini Pro / Flash, GPT-5)
- Title generation uses the low-tier model (Haiku / Flash-Lite)
- Tabular review uses the mid-tier (Sonnet / Flash / GPT-5 Mini)
- Skill router runs a small classifier — same key as main chat

If a slot is marked read-only with "Configured by server admin", the operator set that provider in \`backend/.env\` and locked it. Ask them to unset \`ANTHROPIC_API_KEY\` etc. if you want to bring your own.
`,
        related: ["integrations", "skill-router", "appearance"],
    },
    {
        slug: "prompt-library",
        title: "Prompt Library",
        category: "features",
        icon: BookA,
        summary: "152 expert-crafted legal prompts (drafting / review / research / strategy), filter by use case + practice area, one click to use.",
        body: `
Open **/prompt-library**. Cards are filterable by:
- **Use case**: Draft / Generate · Review / Redline · Summarize / Extract · Research · Compliance · Strategy
- **Practice area**: Corporate / Commercial · Privacy · Employment · Disputes · FinTech · M&A · Arbitration · Governance · Legal Ops · IP

Click **Use in Louis** to send the template to the /assistant composer (placeholders included — fill them in conversation). Click the copy icon to grab the raw template.

Every prompt is a real Louis skill under \`backend/src/skills/prompt-pack.*.md\` — they're not stored in a database, they're version-controlled markdown files you can fork.
`,
        related: ["skills-library", "assistant"],
    },
    {
        slug: "appearance",
        title: "Appearance — themes, fonts, density",
        category: "settings",
        icon: SettingsIcon,
        summary: "Customize the look of the workbench: theme palette, serif/sans font, density, text scale.",
        body: `
**Settings → Appearance**.

**Theme**: cream (default), paper, slate, clean light, dark. Each swaps the workbench palette (background, surface, borders, accents) — every component re-themes automatically.

**Font**: EB Garamond serif (default), Inter sans, system serif, monospace, or system sans. Applies everywhere the UI reads from \`--font-sans\`.

**Density**: comfortable / compact. Tightens vertical rhythm on flexible containers.

**Text size**: scale from 85% to 125%.

Settings sync to your user profile if you're signed in, and to localStorage as a per-device fallback. A boot script runs before React hydrates so the page paints with your settings instantly — no flash of the default theme.
`,
        related: ["api-keys"],
    },
    {
        slug: "feedback",
        title: "Message feedback (thumbs up / down)",
        category: "features",
        icon: BookA,
        summary: "Rate every assistant message. Used to tune the skill router and surface bad answers to the team.",
        body: `
Every assistant message in /assistant has a thumbs-up and thumbs-down button next to Copy. Click one to record a rating; click the same one again to clear it (toggle).

Ratings are per-user and per-message. They live in \`chat_message_feedback\` with full RLS — you can only see and modify your own. The team admin pages aggregate them anonymously to spot bad turns.

In future sessions the skill router will use the corpus of thumbs-up turns as the implicit training signal for which skill combinations actually work for which message shapes.
`,
        related: ["assistant", "skill-router"],
    },
    {
        slug: "integrations",
        title: "Integrations — connect what you use",
        category: "settings",
        icon: Plug,
        summary: "30+ integrations across legal tools, productivity, billing, AI/MCP, research, developer.",
        body: `
Categories:
- **Legal tools**: OpenClaw, MS Word, Google Docs, Tawqi3i, DocuSign, UAE Pass, Legal Data Hunter
- **Research**: Westlaw, LexisNexis, CourtListener, EUR-Lex, Legifrance, WIPO, Companies House, SEC EDGAR
- **Productivity**: Gmail, Outlook, Calendar (Google + Microsoft), Slack, Notion, Drive, WhatsApp
- **Billing / CRM**: Stripe, HubSpot, QuickBooks, Xero
- **AI / MCP**: MCP servers (custom URL), Thomson Reuters CoCounsel, Harvey bridge
- **Developer**: GitHub, Linear, PostHog, Cloudflare, Figma

OAuth, API key, URL, or no-auth depending on the integration. **MCP** integration lets you point Louis at any Model Context Protocol server URL — instant tool access.
`,
    },
    {
        slug: "new-skill",
        title: "Create a custom skill",
        category: "developers",
        icon: Wrench,
        summary: "Add new skills via the UI — no code deploy needed. Frontmatter editor + body. Routes available immediately.",
        body: `
At /skills click "+ New skill". You set:
- id (must match \`category.kebab-name\`)
- name
- category (custom or one of the existing ones)
- intent keywords (drive the router)
- jurisdictions
- practice area
- priority (P0-P3)
- body (markdown — this becomes part of the system prompt)

On save: Louis writes the .md file, invalidates the cache, and the skill is immediately routable in chat.

**Built-in skills are read-only** by default. Use \`?force=true\` in the API to override (admin only).
`,
        related: ["skills-library", "skill-router"],
    },
    {
        slug: "skill-router",
        title: "How the skill router works",
        category: "developers",
        icon: SettingsIcon,
        summary: "Per-turn: classify intent, pick 8-13 skills, compose system prompt, observe + log.",
        body: `
**Two layers**
1. **Keyword router** (fast, deterministic): matches intent keywords + jurisdiction hints. Always fires.
2. **LLM fallback** (Gemini Flash, 3s timeout): when keyword router is uncertain, calls LLM to classify intent. Soft-fails to keyword-only if LLM is slow.

**Selection**
For the classified intent + practice area + jurisdiction + document availability, the router picks 8-13 skills from the library. Priority P0-P1 skills are preferred. Skills with matching intent + jurisdiction get score boosts.

**Composition**
Picked skills' bodies are concatenated into a system prompt (avg 10-18k chars). Plus any user customizations from /customize.

**Observability**
Every decision is logged to a 200-entry in-memory ring buffer. Visit /skills → Router tab to see recent decisions + stats by intent + classifier source + skills loaded.

**Test live**: /skills → Router tab → "Test the router" box. Paste a message, see which skills fire.
`,
    },
    {
        slug: "developers-api",
        title: "Developer API",
        category: "developers",
        icon: Wrench,
        summary: "REST endpoints for skills, matters, clauses, citations, risk, flows, routines, referrals.",
        body: `
All endpoints accept \`x-user-id\` header (or auth Bearer token in production). Base URL: \`/api/*\`.

**Public-ish**
- \`GET /api/skills\` — list + filter
- \`GET /api/skills/:id\` — full skill
- \`POST /api/skills/route-test\` — see which skills fire for a message
- \`GET /api/clauses\` — list clauses
- \`POST /api/calculators/eos\` — EOS gratuity
- \`POST /api/citations/format-all\` — render in all styles
- \`POST /api/risk/scan\` — risk-scan a contract

**Authenticated**
- \`/api/matters\`, \`/api/routines\`, \`/api/referral\`, \`/api/onboarding\`, \`/api/api-keys\`, \`/api/integrations\`, \`/api/legal-flows\`

**Write-API**
- \`POST /api/skills\` — create custom skill
- \`PUT /api/skills/:id\` — update custom skill
- \`DELETE /api/skills/:id\` — delete custom skill (custom only)
`,
        related: ["new-skill", "skill-router", "api-examples"],
    },
    {
        slug: "api-examples",
        title: "API examples — curl recipes",
        category: "developers",
        icon: Wrench,
        summary: "Copy-paste curl commands for every major endpoint. Useful for scripting + automation.",
        body: `
All examples use \`x-user-id: demo\` for the in-memory dev store. Replace with a Supabase JWT \`Authorization: Bearer <token>\` in production.

**Route the skill router on a free-text message**
\`\`\`
curl -X POST http://localhost:3001/api/skills/route-test \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Draft a mutual NDA between Acme (DIFC) and Globex (JAFZA)"}'
\`\`\`

**Compute UAE end-of-service for 5 years at AED 15k/mo basic**
\`\`\`
curl -X POST http://localhost:3001/api/calculators/eos \\
  -H "Content-Type: application/json" \\
  -d '{"jurisdiction":"UAE","basicSalaryMonthly":15000,"serviceDays":1825,"endedByResignation":false}'
\`\`\`

**Scan a contract for risks (DIFC)**
\`\`\`
curl -X POST http://localhost:3001/api/risk/scan \\
  -H "Content-Type: application/json" \\
  -d '{"jurisdiction":"DIFC","text":"This Agreement may be terminated at any time..."}'
\`\`\`

**Render a citation in all 9 styles**
\`\`\`
curl -X POST http://localhost:3001/api/citations/format-all \\
  -H "Content-Type: application/json" \\
  -d '{"input":{"sourceType":"case","caseName":"Smith v Jones","caseYear":2024,"court":"DIFC CFI","citation":"CFI-001-2024"}}'
\`\`\`

**Run a conflict check on prospective parties**
\`\`\`
curl -X POST http://localhost:3001/api/matters/conflict-check \\
  -H "x-user-id: demo" -H "Content-Type: application/json" \\
  -d '{"parties":[{"name":"Acme Trading LLC","role":"counterparty"}]}'
\`\`\`

**Create a custom skill (writes a .md file on disk + invalidates router cache)**
\`\`\`
curl -X POST http://localhost:3001/api/skills \\
  -H "Content-Type: application/json" \\
  -d '{
    "id":"custom.gulf-employment-screen",
    "name":"Gulf employment screen",
    "category":"review",
    "intent":["employment","gulf"],
    "jurisdictions":["UAE","KSA"],
    "priority":"P2",
    "body":"Skill: screen Gulf employment contracts for EOSB, non-compete, probation..."
  }'
\`\`\`

**Add an API key (Anthropic example)**
\`\`\`
curl -X POST http://localhost:3001/api/api-keys \\
  -H "x-user-id: demo" -H "Content-Type: application/json" \\
  -d '{"provider":"anthropic","key":"sk-ant-xxx","label":"firm","isDefault":true}'
\`\`\`

**Connect an MCP server**
\`\`\`
curl -X POST http://localhost:3001/api/integrations/mcp-server/connect \\
  -H "x-user-id: demo" -H "Content-Type: application/json" \\
  -d '{"config":{"serverUrl":"https://mcp.example.com/v1"}}'
\`\`\`

**Start a Legal Flow run (MSA negotiation)**
\`\`\`
curl -X POST http://localhost:3001/api/legal-flows/runs \\
  -H "x-user-id: demo" -H "Content-Type: application/json" \\
  -d '{"flowId":"msa-negotiate"}'
\`\`\`

**Trigger a routine run-now**
\`\`\`
curl -X POST http://localhost:3001/api/routines/{routineId}/run \\
  -H "x-user-id: demo"
\`\`\`
`,
        related: ["developers-api", "skill-router"],
    },
    {
        slug: "mcp-integration",
        title: "MCP — Model Context Protocol",
        category: "developers",
        icon: Plug,
        summary: "Point Louis at any MCP server URL — instant tool access from chat.",
        body: `
The Model Context Protocol (MCP) is a vendor-neutral way to expose tools, resources, and prompts to AI assistants. Louis is an MCP **client** — connect any compliant server and its tools become callable from chat.

**How to connect**
1. Go to **/integrations**
2. Find **MCP Server (custom)**, click **Connect**
3. Paste the server URL (must implement MCP over HTTP / SSE)

**What you get**
- Tools exposed by the server appear as callable functions in the assistant
- Resources are surfaced as files / RAG sources
- Prompts can be invoked via slash commands

**Self-built MCP servers**
Examples of servers you might build for legal:
- Internal precedent database (your firm's KB)
- Client portal API (matter lookup, time entry)
- Document management system (NetDocuments, iManage, Worldox)
- Compliance feed (in-house regulatory tracker)

**Public MCP servers to try**
- Cloudflare (account management, KV, R2, D1) — \`mcp__claude_ai_Cloudflare_*\`
- Notion (page CRUD)
- Linear (issue tracking)
- PostHog (analytics queries)
- Stripe (payments + customers)

**Auth**
For api-key-protected MCP servers, pass the key in the integration config payload. For OAuth-protected servers, the OAuth flow runs in a popup.

**Spec**: https://spec.modelcontextprotocol.io/
`,
        related: ["integrations", "developers-api"],
    },
    {
        slug: "self-hosting",
        title: "Self-hosting Louis",
        category: "developers",
        icon: Code,
        summary: "Run Louis on your own infrastructure. Cloudflare Workers + Supabase + R2 stack.",
        body: `
Louis is MIT-licensed and self-hostable. The full stack:

**Required**
- Supabase project (Auth + Postgres) — free tier OK for dev
- A model provider API key (Anthropic / OpenAI / Google) — at least one
- Node.js 22+ + npm

**Recommended for prod**
- Cloudflare account (Workers, R2 for documents, KV for cache)
- A domain + Cloudflare DNS
- PostHog account for analytics (free tier OK)

**Quickstart**
\`\`\`
git clone https://github.com/sboghossian/louis-legal
cd louis-legal
# Backend
cd backend
cp .env.example .env  # fill in keys
npm install
npm run dev
# Frontend (new terminal)
cd ../frontend
cp .env.local.example .env.local  # fill in keys
npm install
npm run dev
\`\`\`

**Skills location**
\`backend/src/skills/*.md\` — author / edit / delete. The loader watches the directory in dev mode and invalidates the cache on save.

**Storage**
Documents live in Cloudflare R2 (S3-compatible) by default. Switch via \`STORAGE_PROVIDER=supabase\` to use Supabase Storage.

**Production checklist**
- Set \`NODE_ENV=production\`
- Enable rate limiting (already wired)
- Set \`DOWNLOAD_SIGNING_SECRET\` (32+ random bytes)
- Set \`USER_API_KEYS_ENCRYPTION_SECRET\` for at-rest API key encryption
- Enable Supabase RLS on \`api_keys\`, \`matters\`, \`onboarding_profiles\` tables
- Configure Supabase OAuth providers (Google, Microsoft) — see /docs/oauth-setup
`,
    },
    {
        slug: "oauth-setup",
        title: "Setting up Google + Microsoft OAuth",
        category: "developers",
        icon: Key,
        summary: "Wire up Supabase OAuth providers — 10-minute setup.",
        body: `
The Louis login + signup pages have Google + Microsoft buttons. To make them work, enable the providers in your Supabase project.

**Google**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new OAuth 2.0 Client ID (type: Web application)
3. Authorized redirect URI: \`https://<your-supabase-project>.supabase.co/auth/v1/callback\`
4. Copy the Client ID + Secret
5. In Supabase Dashboard → Authentication → Providers → Google:
   - Enable
   - Paste Client ID + Secret
   - Save

**Microsoft (Azure AD / Entra ID)**
1. Go to https://entra.microsoft.com → App registrations → New registration
2. Name: "Louis"
3. Supported account types: Accounts in any organizational directory + personal Microsoft accounts
4. Redirect URI (Web): \`https://<your-supabase-project>.supabase.co/auth/v1/callback\`
5. Create a Client Secret (Certificates & secrets → New client secret)
6. In Supabase Dashboard → Authentication → Providers → Azure:
   - Enable
   - Application (client) ID = the Azure app ID
   - Secret Value = the secret you just created
   - Tenant = \`common\` (for multi-tenant) or your specific tenant ID

**Redirect URLs in Supabase**
Authentication → URL Configuration → Redirect URLs:
\`\`\`
http://localhost:3000/auth/callback
https://your-domain.com/auth/callback
\`\`\`

That&apos;s it — the buttons on /login + /signup will work immediately.

**Troubleshooting**
- "No session returned" → provider not enabled in Supabase
- "Redirect URI mismatch" → check the callback URL in both Google/Azure and Supabase Redirect URLs list
- Microsoft account types mismatch → set to "Accounts in any organizational directory and personal Microsoft accounts"
`,
        related: ["api-keys"],
    },
    {
        slug: "security",
        title: "Security & data handling",
        category: "developers",
        icon: ShieldAlert,
        summary: "How Louis treats your data: encryption, isolation, no-training defaults, audit logs.",
        body: `
**Data isolation**
Each tenant is row-isolated in Supabase Postgres via RLS. Cross-tenant queries are physically impossible in the application layer.

**API keys**
Plaintext keys live only in-process for the duration of a request. At rest (when SQL migration ships) they&apos;re encrypted with AES-256-GCM using \`USER_API_KEYS_ENCRYPTION_SECRET\`. Reads return only the masked form (\`sk-a•••7890\`).

**Documents**
Stored in Cloudflare R2 (or Supabase Storage) with signed-URL access only. Download tokens are HMAC-signed with \`DOWNLOAD_SIGNING_SECRET\` and expire in 5 minutes.

**Model providers**
Louis sends only the user-message + the routed skills' system-prompt to the model API. It does NOT train the model with your data — providers (Anthropic, OpenAI, Google) all offer a no-training mode, which Louis uses by default.

**Privileged content**
Louis does not assert attorney-client privilege over its conversations. Lawyers using Louis for client matters should:
- Disclose AI use in the engagement letter ([[safety-compliance.AI-not-privileged-disclaimer-US]])
- Use enterprise-grade providers with no-training
- Keep matter-linked content tenant-isolated

**Audit log**
Every model call, skill route decision, and integration use is logged. View under /skills → Router for skill decisions; full audit log requires Business plan.

**Cross-border transfers**
EU users can opt into EU-only data residency. GCC region launches 2026 Q2. See [[safety.cross-border-data-transfer-GCC-EU]] for the legal framework.
`,
    },
    {
        slug: "architecture",
        title: "Architecture overview",
        category: "developers",
        icon: Network,
        summary: "How the skill router, model orchestration, and matter context fit together.",
        body: `
**Request lifecycle (chat turn)**
1. User message arrives at \`POST /chat\`
2. Auth middleware verifies Supabase JWT
3. Skill router (\`backend/src/skills/_router.ts\`) classifies intent + jurisdiction + practice area
4. Picks 8-13 skills based on score (priority + intent match + jurisdiction match)
5. Composes system prompt: concatenated skill bodies + customize toggles
6. Selects model: user&apos;s default API key for chosen provider (falls back to env default)
7. Streams response via SSE
8. Logs decision to in-memory ring buffer for observability

**Skill router internals**
Two layers:
- **Keyword router** — fast, deterministic. Always fires.
- **LLM fallback** — Gemini Flash with 3s timeout. Soft-fails to keyword-only.

The router&apos;s output is just a list of skill IDs + their composed prompt. Look at \`/skills → Router\` tab for live decisions.

**No fine-tuning bet**
We don&apos;t fine-tune custom models. Frontier models + retrieval + skill composition + per-user customize is a more durable bet — every model upgrade gives us a free quality lift. See [[eng.architectural-bet-no-fine-tuning]].

**Document handling**
- Upload → R2 storage with signed-URL
- OCR (if needed) via pdfjs-dist + Vision API
- AST extraction: clauses tagged with anchors
- Embeddings via Voyage-2-large into per-tenant index
- RAG over user docs + public corpus when matter-bound

**Matter context binding**
When a chat is bound to a matter, every system prompt includes matter metadata (parties, jurisdictions, status, recent events). Skills can reference matter context via \`{{matter.*}}\` template vars (planned for v1.0).

**Frontend stack**
Next.js 16 / React 19 / Tailwind / Shadcn UI. Server Components for static pages, Client Components for interactive surfaces. SSE streaming for chat.

**Backend stack**
Express + TypeScript + Supabase Postgres + Cloudflare R2 + Anthropic / Gemini / OpenAI clients.
`,
        related: ["skill-router", "self-hosting"],
    },
    {
        slug: "roadmap",
        title: "Roadmap",
        category: "getting-started",
        icon: Zap,
        summary: "What's shipping next + what we're considering. Open to community input.",
        body: `
**Q2 2026 — shipping now**
- Google + Microsoft OAuth ✓
- Custom skills editor (UI) ✓
- API keys management (13 providers) ✓
- Integrations hub (32 connectors) ✓
- Onboarding wizard ✓
- App launcher (HAQQ products) ✓
- Sidebar reorganization with collapsible groups ✓

**Q3 2026 — planned**
- Stripe billing integration (live plan + credit balance + portal)
- Team management with role-based permissions (Business plan)
- MENA-region data residency (Saudi + UAE)
- Word add-in (Office365 sideload)
- Tawqi3i e-signature bridge (KSA)
- DocuSign integration
- Skills GitHub-repo sync (custom skills as PRs)
- Citation auto-detect + bulk-conversion
- Multi-doc compare (3+ documents side-by-side)

**Q4 2026 — exploring**
- Justinian deep integration (cross-product user identity)
- Local-first mode (browser-only, no backend)
- Skill marketplace (community + paid)
- DIFC + ADGM Courts judgment ingestion (auto-fed from official sources)
- Voice-mode (Arabic + English + French)
- Mobile apps (iOS + Android)
- On-prem self-hosting guide for firms with strict residency

**2027 — directional**
- Custom model fine-tuning option (opt-in per tenant)
- Native MCP server for Louis (so other AI tools can call Louis)
- Federated skill libraries (firm-private + shared)
- Real-time co-authoring in Doc Workspace

**Get involved**
- File feature requests / bug reports: GitHub Issues
- Contribute skills: see /docs/new-skill — open a PR
- Translation help (Arabic, French): get in touch
- Beta testing programs: starting Q2
`,
    },
    {
        slug: "compare",
        title: "Louis vs. alternatives",
        category: "getting-started",
        icon: Brain,
        summary: "Honest comparison with Harvey, CoCounsel, Spellbook, Genie AI, Robin AI.",
        body: `
**Louis wins on**
- MENA jurisdictions (DIFC / ADGM / KSA / UAE / LB / EG)
- Arabic-native bilingual contracts
- Skill router transparency (you see every decision)
- Open source (MIT — self-hostable)
- BYO API keys (lower cost; provider-of-choice)
- 982 skills shipped — composable, editable, versionable
- Custom skill authoring without redeploys
- MCP-first integration approach

**Harvey wins on**
- US BigLaw integration depth
- Allen & Overy / Kirkland / Skadden firm-specific styling
- Premier client list / proven enterprise sales

**CoCounsel wins on**
- Westlaw / Practical Law citation depth
- Existing Thomson Reuters enterprise license overlap
- US case-law research

**Spellbook wins on**
- Word-add-in polish (early mover)
- Mid-market US firms

**Genie AI wins on**
- Consumer / SMB pricing
- Template library scale

**Robin AI wins on**
- Specific contract-type workflows (NDA, employment, services)

**Honest weaknesses of Louis (today)**
- US case-law depth is shallower than Westlaw / Lexis
- BigLaw enterprise sales motion is nascent
- Word add-in shipping Q3 2026 (not today)
- Self-hosting docs are thin (we&apos;re working on it)

The honest pitch: pick Louis if you operate in MENA, value transparency + open source, or want to bring your own model keys. Pick the others if your needs are squarely US/UK BigLaw or you need an established enterprise vendor.
`,
    },
    {
        slug: "contribute",
        title: "Contribute to Louis",
        category: "developers",
        icon: BookA,
        summary: "How to add skills, fix bugs, or build entire features. PRs welcome.",
        body: `
**Areas where we&apos;d love help**

**1. Skills authoring (highest leverage)**
Each skill is a markdown file. Adding a high-quality skill for your practice area takes ~30 min and benefits every Louis user. See \`/docs/new-skill\` for the format.

**2. Jurisdiction packs**
We have 982 skills but coverage is uneven. If you practice in a jurisdiction we&apos;re weak in (Egypt, Jordan, Morocco, Tunisia, Algeria, Kuwait, Oman, Qatar, Bahrain), open a PR adding kb.* skills.

**3. Integrations**
MCP-server adapters for tools your firm uses. Each adapter = ~100 lines of TS.

**4. UI polish**
Find a rough edge → open an issue or a PR. Bonus points for keyboard shortcuts + accessibility.

**5. Translation**
Localize the UI to Arabic + French. The skills are bilingual; the UI is currently English-first.

**6. Tests**
Skill router tests, calculator tests, citation engine tests. Coverage is patchy.

**How to contribute**
1. Fork [github.com/sboghossian/louis-legal](https://github.com/sboghossian/louis-legal)
2. Create a branch: \`git checkout -b skill/your-name\`
3. Make your change + run \`npm run typecheck\` (both backend + frontend)
4. Open a PR with a clear description + screenshots for UI changes

**Code of conduct**
Be kind. No PR is too small. No question is dumb.

**Recognition**
Top contributors are featured on /about. Skill authors get attribution in the skill frontmatter.
`,
        related: ["new-skill", "self-hosting"],
    },
];

const CATEGORIES = [
    { id: "getting-started", label: "Getting Started" },
    { id: "features", label: "Features" },
    { id: "infrastructure", label: "Legal Infrastructure" },
    { id: "settings", label: "Settings & Integrations" },
    { id: "developers", label: "Developers" },
] as const;

export default function DocsPage() {
    const [q, setQ] = useState("");
    const [selected, setSelected] = useState<string>("quickstart");

    const filtered = DOCS.filter(d => {
        if (!q.trim()) return true;
        const needle = q.toLowerCase();
        return d.title.toLowerCase().includes(needle) || d.body.toLowerCase().includes(needle) || d.summary.toLowerCase().includes(needle);
    });

    const current = DOCS.find(d => d.slug === selected);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-[320px] flex-shrink-0 border-r border-gray-200 flex flex-col">
                <div className="px-5 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-5 h-5 text-gray-700" />
                        <h1 className="text-lg font-semibold">Documentation</h1>
                        <Badge variant="secondary">{DOCS.length}</Badge>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search docs…" className="pl-9" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {CATEGORIES.map(cat => {
                        const entries = filtered.filter(d => d.category === cat.id);
                        if (entries.length === 0) return null;
                        return (
                            <div key={cat.id} className="py-2">
                                <div className="px-5 py-1 text-[10px] uppercase tracking-wide font-semibold text-gray-500">{cat.label}</div>
                                {entries.map(d => {
                                    const Icon = d.icon;
                                    return (
                                        <button
                                            key={d.slug}
                                            onClick={() => setSelected(d.slug)}
                                            className={`w-full text-left px-5 py-2 hover:bg-gray-50 flex items-start gap-2 ${selected === d.slug ? "bg-blue-50" : ""}`}
                                        >
                                            <Icon className="w-3.5 h-3.5 mt-0.5 text-gray-500 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{d.title}</div>
                                                <div className="text-[10px] text-gray-500 truncate">{d.summary}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 overflow-y-auto">
                {current && (
                    <div className="max-w-3xl mx-auto px-12 py-10">
                        <div className="flex items-center gap-2 mb-2">
                            <current.icon className="w-5 h-5 text-gray-700" />
                            <Badge variant="secondary" className="text-[10px]">{CATEGORIES.find(c => c.id === current.category)?.label}</Badge>
                        </div>
                        <h1 className="text-3xl font-semibold mb-2">{current.title}</h1>
                        <p className="text-gray-600 mb-8">{current.summary}</p>
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed">
                            {renderBody(current.body)}
                        </div>
                        {current.related && current.related.length > 0 && (
                            <div className="mt-12 pt-6 border-t border-gray-200">
                                <div className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-3">Related</div>
                                <div className="flex flex-wrap gap-2">
                                    {current.related.map(slug => {
                                        const rel = DOCS.find(d => d.slug === slug);
                                        if (!rel) return null;
                                        return (
                                            <button
                                                key={slug}
                                                onClick={() => setSelected(slug)}
                                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50"
                                            >
                                                {rel.title}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="mt-10 pt-6 border-t border-gray-200 text-xs text-gray-500">
                            <p>
                                Found something missing or wrong? <Link href="/about" className="text-blue-600 underline">About → contribute on GitHub</Link>.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function renderBody(body: string): React.ReactNode {
    // Very lightweight markdown: **bold**, `code`, lists, headers
    const lines = body.trim().split("\n");
    const out: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.startsWith("```")) {
            // Code block
            const codeLines: string[] = [];
            i++;
            while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
            i++; // skip closing ```
            out.push(
                <pre key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-3 text-xs font-mono whitespace-pre-wrap">
                    {codeLines.join("\n")}
                </pre>
            );
            continue;
        }
        if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
            out.push(<h3 key={i} className="text-sm font-semibold mt-5 mb-2 text-gray-900">{line.slice(2, -2)}</h3>);
            i++;
            continue;
        }
        if (line.startsWith("- ")) {
            const items: string[] = [];
            while (i < lines.length && lines[i].startsWith("- ")) { items.push(lines[i].slice(2)); i++; }
            out.push(
                <ul key={i} className="list-disc list-outside ml-5 my-2 space-y-1 text-sm">
                    {items.map((it, j) => <li key={j} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />)}
                </ul>
            );
            continue;
        }
        if (!line.trim()) {
            out.push(<div key={i} className="h-2" />);
            i++;
            continue;
        }
        out.push(<p key={i} className="my-2 text-sm" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />);
        i++;
    }
    return out;
}

function renderInline(text: string): string {
    return text
        .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1 rounded text-xs">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline" target="_blank" rel="noreferrer">$1</a>');
}
