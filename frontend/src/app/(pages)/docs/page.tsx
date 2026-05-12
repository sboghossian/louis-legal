"use client";

import { useState } from "react";
import { BookOpen, Search, Zap, FileText, Briefcase, ShieldAlert, Quote, Calculator, Workflow, Sparkles, Wrench, Plug, Key, Repeat, Gift, Settings as SettingsIcon, BookA, Network } from "lucide-react";
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
        summary: "Use your own Anthropic / OpenAI / Gemini / Voyage / etc keys. Set defaults per provider.",
        body: `
Settings → API Keys. Add a key, label it, set as default for that provider. Louis uses your key for chat / drafting / research instead of (or in addition to) HAQQ's pooled key.

**Cost transparency**: your tokens, your bill — you see exactly what each turn costs in your provider dashboard.

Supported providers: Anthropic, OpenAI, Google, Voyage, Groq, DeepSeek, Mistral, OpenRouter, Cerebras, Perplexity, Tavily, Firecrawl, Hugging Face.
`,
        related: ["integrations", "skill-router"],
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
        related: ["new-skill", "skill-router"],
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
