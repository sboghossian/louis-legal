"use client";

/**
 * Academy — Louis's user-facing learning surface.
 *
 * Merges the previous /docs and /help into a single page. Content is
 * written to match the product as it actually behaves today — each
 * entry maps to a sidebar surface the user can open immediately.
 *
 * Structure:
 *   ─ Search across all entries
 *   ─ Tabs: All · Get started · Work · Customize · Account · Developers
 *   ─ Cards with a 1-line summary; click expands the full body in-place
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";
import {
    BookOpenCheck,
    Search,
    Zap,
    MessageSquare,
    FileText,
    Network,
    Library,
    BookOpen,
    ShieldAlert,
    Quote,
    Calculator,
    Workflow,
    Table2,
    BookMarked,
    Lock,
    Briefcase,
    Building2,
    Repeat,
    SlidersHorizontal,
    Sparkles,
    Plug,
    Key,
    Rss,
    Settings as SettingsIcon,
    CreditCard,
    Users,
    Gift,
    Info,
    Code,
    Brain,
    type LucideIcon,
} from "lucide-react";

type Category =
    | "get-started"
    | "work"
    | "customize"
    | "account"
    | "developers";

interface Entry {
    slug: string;
    title: string;
    category: Category;
    icon: LucideIcon;
    summary: string;
    /** Markdown-lite: plain text, **bold**, [links](href) handled. */
    body: string;
    open?: string; // href the "Open" button on the card points to
    related?: string[];
}

const ENTRIES: Entry[] = [
    // -----------------------------------------------------------------
    // GET STARTED
    // -----------------------------------------------------------------
    {
        slug: "quickstart",
        title: "Quickstart — your first 5 minutes",
        category: "get-started",
        icon: Zap,
        summary:
            "Sign up, complete onboarding once, ask your first question.",
        body: `
**Sign up:** [/signup](/signup). New accounts skip Supabase's email-confirmation gate (we use server-side admin signup), so you'll be in immediately.

**Onboarding:** asks 6 quick questions to tune the assistant for your role + jurisdictions + practice areas. Only runs *once* per account — returning users go straight to the workbench.

**Try the assistant:** [/home](/home) is the dashboard + composer. Type a question or hit a prompt from the library. Per-message thumbs up/down feeds the team review.

**Upload a contract:** drag a PDF/DOCX into a chat or open [/projects](/projects) → "New project" to start a matter folder.

**Pick your model:** [/settings/api-keys](/settings/api-keys) — paste your Anthropic / Gemini / OpenAI key. Your key always wins over the server's fallback.
`,
        open: "/home",
        related: ["assistant", "appearance"],
    },
    {
        slug: "sidebar-map",
        title: "Sidebar at a glance",
        category: "get-started",
        icon: BookMarked,
        summary:
            "What every entry in the sidebar does, in one screen.",
        body: `
**Pinned (top of sidebar):**
- **Home** — dashboard + composer. Where most sessions start.
- **Assistant** — the streaming chat surface with reasoning, citations, doc reads.
- **Newsfeed** — Reddit-backed legal industry chatter, customizable topics.
- **Inbox** — notifications, deadlines, routine outputs.
- **All Chats** — every conversation across your projects.
- **Projects** — matter folders for documents + chats.

**Work group** (collapsible):
- Doc Workspace · Drafting Board · Clause Library · Risk Scanner · Citations
- EOS Calculator · Legal Flows · Tabular Review · Prompt Library · Vault
- Matters · e-Firm · Routines

**Customize group:**
- Customize hub — Sources / Tools / Jurisdictions / Skills / Vault toggles
- Skills · Workflows · Integrations

**Account group:**
- Settings (Profile / Appearance / Models / Billing / Team / Notifications / Security)
- API Keys · Billing · Upgrade · Team

**More:** Academy · Referral · About.

**Favorites:** hover any item, click the star — it pins to the top.
`,
        related: ["favorites", "customize-hub"],
    },
    {
        slug: "favorites",
        title: "Favorites — pin the surfaces you actually use",
        category: "get-started",
        icon: BookMarked,
        summary:
            "Click the star next to any sidebar entry to pin it.",
        body: `
Each sidebar item shows a faint star on hover. Click it to pin the surface to the top of the sidebar (under "Favorites"). Click again to unpin. Favorites are stored per-browser; sign-in syncs the rest of your settings but not favorites — that's intentional, since pinning is usually a per-device habit.
`,
    },
    {
        slug: "appearance",
        title: "Appearance — themes, fonts, density, language",
        category: "get-started",
        icon: SettingsIcon,
        summary:
            "Cream (default), Paper, Slate, Dark; serif / sans / mono; 11 languages.",
        body: `
[/settings](/settings) → **Appearance** tab.

- **Theme:** cream, paper, slate, clean light, dark. Each repaints the workbench palette — every surface re-themes automatically.
- **Font:** EB Garamond serif (default), Inter sans, system serif, monospace, system sans.
- **Density:** comfortable or compact.
- **Text size:** 85–125%.
- **Language:** 11 locales including Arabic (RTL auto-applied).

Settings sync to your profile if signed in; otherwise persisted per browser. A boot script applies your stored choices before React paints so the first frame already looks right (no flash of default).
`,
        open: "/settings",
    },

    // -----------------------------------------------------------------
    // WORK
    // -----------------------------------------------------------------
    {
        slug: "assistant",
        title: "Assistant — chat with documents + skills",
        category: "work",
        icon: MessageSquare,
        summary:
            "Streaming chat with reasoning, doc-reads, citations, thumbs feedback.",
        body: `
[/assistant](/assistant) is the streaming chat surface.

- Type \`/\` for slash commands (/draft, /review, /research, /translate, /calc, /summarize, /demo, /help).
- **Reasoning** is shown by default in a collapsible block whenever the model exposes thinking (Claude adaptive, Gemini includeThoughts, OpenAI reasoning.summary).
- Upload a PDF/DOCX (or pick from a project) — OCR runs automatically for scanned files.
- Skill router transparently shows which of ~980 skills fired for each turn — click the badges to see the system prompts.
- **Thumbs up/down** under each assistant message. Click the same one again to clear it.
- **Voice dictation:** click the Mic icon in the composer (browsers that support Web Speech API). Final transcripts are appended; interim is discarded.

⌘↩ to send. Esc closes slash menu.
`,
        open: "/assistant",
        related: ["prompt-library", "feed"],
    },
    {
        slug: "doc-workspace",
        title: "Doc Workspace — version + redline a single document",
        category: "work",
        icon: FileText,
        summary:
            "Per-doc editor with versions, accept/reject suggestions, side-by-side compare.",
        body: `
[/doc-workspace?docId=…](/doc-workspace) is the per-document editor. Open from chat → "Open in workspace" or from a project.

- Version history (every edit saves a new version).
- Suggestions panel: each AI proposal is an accept/reject card.
- Comments anchored to clauses (stable across edits).
- Tone slider: plain · balanced · formal.
- View modes: edit, review, read, compare.
- Big **Open in Board** button → see this document inside the Drafting Board flow.
`,
        open: "/doc-workspace",
        related: ["drafting-board"],
    },
    {
        slug: "drafting-board",
        title: "Drafting Board — agentic legal workflows",
        category: "work",
        icon: Network,
        summary:
            "Node-graph of agent steps + human gates. Templates for M&A, Employment, DD, Contract Review.",
        body: `
[/drafting-board](/drafting-board) is a visual workspace.

- Each node is a deliverable (term sheet, redline, memo, contract) with a status — idle / running / done / blocked / needs_approval.
- Color + chip tells you what's happening at a glance.
- Left rail palette: click-to-add nine kinds of nodes.
- Four templates load a real-shaped workflow: **M&A · Acme × Globex**, **Employment**, **Due diligence**, **Contract review**.
- "Run agent" picks the next idle node, walks it through statuses, and shows the real skill IDs that fired on it.
- Gates pause for approval — click the node, hit Approve, downstream nodes unblock automatically.
`,
        open: "/drafting-board",
        related: ["doc-workspace", "legal-flows"],
    },
    {
        slug: "prompt-library",
        title: "Prompt Library",
        category: "work",
        icon: BookMarked,
        summary:
            "152 expert prompts (drafting / review / research / strategy). Filter, search, send to assistant.",
        body: `
[/prompt-library](/prompt-library) — 152 prompts ported from haqq.ai.

- Filter by use case: Draft / Generate, Review / Redline, Summarize / Extract, Research / Authorities, Compliance / Diligence, Strategy / Scenario.
- Filter by practice area.
- "Use in Louis" sends the template (with bracketed fields) to the assistant composer.
- Templates are markdown files under \`backend/src/skills/prompt-pack.*.md\` — fork them.
`,
        open: "/prompt-library",
        related: ["assistant", "skills"],
    },
    {
        slug: "newsfeed",
        title: "Newsfeed — Reddit on legal industry",
        category: "work",
        icon: Rss,
        summary:
            "Live Reddit threads on legal industry, customizable topics, 5-min cache.",
        body: `
[/feed](/feed). Default topics: Legal, Big Law, Legal Advice, Legal Tech, Legal AI, Anthropic Claude × Legal, Open source legal, Microsoft × Legal, plus named products (Harvey, Clio, Spellbook, CoCounsel, Legora, Monitz).

- Filter chips switch topics; click the × on a chip to remove that topic.
- "Add topic" — name it, list subreddits and/or keywords, save.
- Refresh button bypasses the local memo; server caches each topic for 5 minutes.
- Signed-in users sync topics to their profile; signed-out users see defaults.
`,
        open: "/feed",
    },
    {
        slug: "clauses",
        title: "Clause Library",
        category: "work",
        icon: BookOpen,
        summary: "Vetted clause snippets with side-by-side compare.",
        body: `[/clauses](/clauses). Browse + insert clause patterns; compare two variants side-by-side.`,
        open: "/clauses",
    },
    {
        slug: "risk-scanner",
        title: "Risk Scanner",
        category: "work",
        icon: ShieldAlert,
        summary: "Paste or upload a contract → 30+ red-flag findings.",
        body: `
[/risk](/risk). Runs a battery of heuristics across the document — payment terms, IP, liability caps, dispute resolution, termination, data-sharing, audit rights — and surfaces severity-ranked findings with proposed redlines.
`,
        open: "/risk",
    },
    {
        slug: "citations",
        title: "Citations engine",
        category: "work",
        icon: Quote,
        summary: "Format any legal source in 9 styles.",
        body: `[/citations](/citations). Bluebook, OSCOLA, DIFC, ALWD, McGill, AGLC, MEN, Chicago, ICJ. Paste a case or paste the components; export the formatted cite.`,
        open: "/citations",
    },
    {
        slug: "eos-calculator",
        title: "End-of-service calculator",
        category: "work",
        icon: Calculator,
        summary: "GCC × 6 jurisdictions — UAE, KSA, Qatar, Bahrain, Kuwait, Oman.",
        body: `[/calculators/eos](/calculators/eos). Enter hire date, last day, basic + allowances, leaves taken, and the calculator computes the statutory gratuity per the jurisdiction's labor law (current as of last review).`,
        open: "/calculators/eos",
    },
    {
        slug: "legal-flows",
        title: "Legal Flows",
        category: "work",
        icon: Workflow,
        summary: "Structured multi-step legal workflows you can run end-to-end.",
        body: `[/legal-flows](/legal-flows). Pre-built sequences: NDA-to-signed, contract review, employment onboarding, vendor KYC. Each flow chains skills + tools; you intervene at gates.`,
        open: "/legal-flows",
    },
    {
        slug: "tabular-review",
        title: "Tabular Review",
        category: "work",
        icon: Table2,
        summary: "Apply the same prompt(s) across many documents.",
        body: `[/tabular-reviews](/tabular-reviews). One column = one question; rows = documents; cells = answers. Like a due-diligence checklist matrix.`,
        open: "/tabular-reviews",
    },
    {
        slug: "vault",
        title: "Vault — encrypted matter storage",
        category: "work",
        icon: Lock,
        summary:
            "AES-256 at rest, privilege-aware routing, audit log per access, per-client isolation.",
        body: `
[/vault](/vault). Documents tagged Vault are encrypted at rest with an AES key derived from your account secret. The skill router won't include them in any chat unless you explicitly opt in for that matter. Every read is logged.

Configure in [/customize → Vault](/customize).
`,
        open: "/vault",
    },
    {
        slug: "matters",
        title: "Matters",
        category: "work",
        icon: Briefcase,
        summary: "Client + matter records with conflict checks.",
        body: `[/matters](/matters). Each matter is the binding context for chats, documents, routines, billing. Cross-client access requires an explicit conflict-of-interest override.`,
        open: "/matters",
    },
    {
        slug: "efirm",
        title: "e-Firm",
        category: "work",
        icon: Building2,
        summary: "Firm-wide command center — billing, capacity, conflicts.",
        body: `[/efirm](/efirm). For boutique firms and in-house teams running Louis as the operating system: WIP, conflicts, partner pipeline, vendor lookups.`,
        open: "/efirm",
    },
    {
        slug: "routines",
        title: "Routines",
        category: "work",
        icon: Repeat,
        summary: "Scheduled AI tasks — digests, deadline reminders, watch lists.",
        body: `[/routines](/routines). Daily/weekly cron-style jobs: "Every Monday at 9, summarize the week's new cases from EUR-Lex and post to my Inbox." Outputs land in [/inbox](/inbox).`,
        open: "/routines",
    },

    // -----------------------------------------------------------------
    // CUSTOMIZE
    // -----------------------------------------------------------------
    {
        slug: "customize-hub",
        title: "Customize — the unified hub",
        category: "customize",
        icon: SlidersHorizontal,
        summary:
            "All / Sources / Tools / Jurisdictions / Skills / Vault toggles in one place.",
        body: `
[/customize](/customize). Five tabs:

- **Sources (32)** — Westlaw, LexisNexis, EUR-Lex, CourtListener, SEC EDGAR, WIPO Lex, country-specific portals (Legifrance, Gesetze, Knesset, NCAR, …).
- **Tools (46)** — MS 365, Google Workspace, Slack, Notion, DocuSign, Tawqi3i, calculators, OCR, MCP.
- **Jurisdictions (42)** — GCC, MENA, Europe, North America, APAC.
- **Skills (~48)** — drafting / review / persona / heuristic / safety / output skills.
- **Vault (9)** — encryption + privilege + audit + retention toggles.

Search across all tabs at the top. Toggle on/off with the switch on each card.
`,
        open: "/customize",
        related: ["skills", "vault"],
    },
    {
        slug: "skills",
        title: "Skills authoring",
        category: "customize",
        icon: Sparkles,
        summary: "~980 skills as markdown files; the router picks 8–13 per turn.",
        body: `[/skills](/skills). Each skill is a markdown file with YAML frontmatter under \`backend/src/skills/\`. Drafting · review · research · jurisdiction · persona · heuristic · safety · output. The router picks ~8–13 per turn based on your message + active matter + jurisdiction context.`,
        open: "/skills",
    },
    {
        slug: "workflows",
        title: "Workflows",
        category: "customize",
        icon: Library,
        summary: "Reusable multi-turn flows you can trigger from chat.",
        body: `[/workflows](/workflows). Define a sequence — system prompt, tool sequence, output schema — and trigger it from the composer with one click. Different from Legal Flows (those are public; workflows are yours).`,
        open: "/workflows",
    },
    {
        slug: "integrations",
        title: "Integrations",
        category: "customize",
        icon: Plug,
        summary: "30+ connectors across legal tools, productivity, billing, AI/MCP, research.",
        body: `[/integrations](/integrations). OAuth, API key, or no-auth depending on the connector. MCP integration lets you point Louis at any MCP server URL — instant tool access.`,
        open: "/integrations",
    },

    // -----------------------------------------------------------------
    // ACCOUNT
    // -----------------------------------------------------------------
    {
        slug: "settings",
        title: "Settings — everything in one place",
        category: "account",
        icon: SettingsIcon,
        summary:
            "Profile, Appearance, Models & API Keys, Billing, Team, Data, Integrations, Notifications, Security.",
        body: `
[/settings](/settings) is the single account hub. The left rail switches between sub-tabs; nothing in here lives on a separate route except API Keys (which has its own deep link at [/settings/api-keys](/settings/api-keys) for quick access).
`,
        open: "/settings",
    },
    {
        slug: "api-keys",
        title: "Bring your own API keys",
        category: "account",
        icon: Key,
        summary:
            "Your stored key always wins over the server's env fallback. AES-256-GCM encrypted at rest.",
        body: `
[/settings/api-keys](/settings/api-keys). Paste a key for Anthropic, Gemini, or OpenAI.

- Stored AES-256-GCM-encrypted with a server-side secret.
- **Precedence**: user > env. The status panel labels each provider with the source that will run the next turn.
- Cost transparency: your tokens, your bill — you see exactly what each turn costs in your provider dashboard.

Slots labeled "Configured by server admin" are read-only — the operator set that provider in \`backend/.env\` and locked it.
`,
        open: "/settings/api-keys",
    },
    {
        slug: "billing",
        title: "Billing",
        category: "account",
        icon: CreditCard,
        summary: "Plan, invoices, payment method. Stripe-backed.",
        body: `[/billing](/billing). Plan tier (Free / Pro / Firm), monthly invoices, credit pack purchases. Connect Stripe in [/integrations](/integrations) if not configured server-side.`,
        open: "/billing",
    },
    {
        slug: "team",
        title: "Team & permissions",
        category: "account",
        icon: Users,
        summary: "Invite collaborators, set roles, share matters.",
        body: `[/team](/team). Invite by email, assign Admin / Member / Read-only, grant per-matter access.`,
        open: "/team",
    },
    {
        slug: "referral",
        title: "Referral",
        category: "account",
        icon: Gift,
        summary: "Two programs: Consumer ($20–100/conversion) and e-Firm (free months).",
        body: `[/referral](/referral). Auto-generates your unique referral code; send invites by email or LinkedIn; track stage progression (clicked → signed-up → converted → reward).`,
        open: "/referral",
    },
    {
        slug: "about-louis",
        title: "About Louis",
        category: "account",
        icon: Info,
        summary:
            "Why we named it Louis (the Suits reference), what's open source, what's the upstream.",
        body: `[/about](/about). Forked from [Mike](https://github.com/willchen96/mike). Named for Louis Litt — the M&A specialist who actually reads the file. MIT licensed.`,
        open: "/about",
    },

    // -----------------------------------------------------------------
    // DEVELOPERS
    // -----------------------------------------------------------------
    {
        slug: "self-hosting",
        title: "Self-hosting Louis",
        category: "developers",
        icon: Code,
        summary: "5 numbered steps; Node 20+, Supabase, S3-compatible bucket, one model key.",
        body: `
\`git clone\` → \`npm install\` per app → fill env → apply \`backend/schema.sql\` → \`npm run dev --prefix backend\` + \`npm run dev --prefix frontend\`. See the [repo README](https://github.com/sboghossian/louis-legal) for the full quickstart.

A live demo runs at https://legal.dashable.dev (Cloudflare-tunneled). Use it for a tour, not for real data.
`,
    },
    {
        slug: "mcp-integration",
        title: "MCP server",
        category: "developers",
        icon: Plug,
        summary: "Expose Louis's calculators, clauses, citations, risk scanner, skill router to any MCP client.",
        body: `[/api/mcp](/api/mcp) implements the Model Context Protocol over HTTP+SSE. Point Claude Desktop or Cursor at the URL — Louis's tools appear immediately.`,
    },
    {
        slug: "architecture",
        title: "Architecture",
        category: "developers",
        icon: Brain,
        summary:
            "Next.js + Express + Supabase + R2; provider adapters for Claude/Gemini/OpenAI; ~980 skills as markdown.",
        body: `See \`docs/ARCHITECTURE.md\` in the repo for the SSE flow, BYO key precedence, skill router, doc versions, tabular review, and MCP server walkthrough.`,
    },
];

const CATEGORIES: { id: Category; label: string; labelKey: string }[] = [
    { id: "get-started", label: "Get started", labelKey: "academy.tab.get_started" },
    { id: "work",        label: "Work",        labelKey: "academy.tab.work" },
    { id: "customize",   label: "Customize",   labelKey: "academy.tab.customize" },
    { id: "account",     label: "Account",     labelKey: "academy.tab.account" },
    { id: "developers",  label: "Developers",  labelKey: "academy.tab.developers" },
];

export default function AcademyPage() {
    const { t } = useLocale();
    const [q, setQ] = useState("");
    const [activeCat, setActiveCat] = useState<"all" | Category>("all");
    const [openSlug, setOpenSlug] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return ENTRIES.filter((e) => {
            if (activeCat !== "all" && e.category !== activeCat) return false;
            if (!needle) return true;
            return (
                e.title.toLowerCase().includes(needle) ||
                e.summary.toLowerCase().includes(needle) ||
                e.body.toLowerCase().includes(needle)
            );
        });
    }, [q, activeCat]);

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: ENTRIES.length };
        for (const cat of CATEGORIES) {
            c[cat.id] = ENTRIES.filter((e) => e.category === cat.id).length;
        }
        return c;
    }, []);

    return (
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
            <div className="flex items-center gap-2 mb-2">
                <BookOpenCheck className="w-6 h-6 text-amber-700" />
                <h1 className="text-2xl font-serif font-semibold">{t("academy.title")}</h1>
            </div>
            <p className="text-sm text-gray-600 mb-6 max-w-2xl">
                {t("academy.intro")}
            </p>

            <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("academy.search_placeholder")}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                />
            </div>

            <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
                <TabButton
                    label={t("academy.tab.all")}
                    count={counts.all ?? 0}
                    active={activeCat === "all"}
                    onClick={() => setActiveCat("all")}
                />
                {CATEGORIES.map((c) => (
                    <TabButton
                        key={c.id}
                        label={t(c.labelKey)}
                        count={counts[c.id] ?? 0}
                        active={activeCat === c.id}
                        onClick={() => setActiveCat(c.id)}
                    />
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-sm text-gray-500 py-12 text-center">
                    {t("academy.empty.prefix", { query: q })}
                    <button
                        type="button"
                        onClick={() => {
                            setQ("");
                            setActiveCat("all");
                        }}
                        className="underline"
                    >
                        {t("academy.empty.clear")}
                    </button>
                    .
                </div>
            )}

            <div className="space-y-2">
                {filtered.map((e) => (
                    <EntryCard
                        key={e.slug}
                        entry={e}
                        open={openSlug === e.slug}
                        onToggle={() =>
                            setOpenSlug((prev) =>
                                prev === e.slug ? null : e.slug,
                            )
                        }
                    />
                ))}
            </div>
        </div>
    );
}

function TabButton({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-2 -mb-px text-sm border-b-2 transition-colors ${
                active
                    ? "border-gray-900 text-gray-900 font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
        >
            {label}
            <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                    active
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-500"
                }`}
            >
                {count}
            </span>
        </button>
    );
}

function EntryCard({
    entry,
    open,
    onToggle,
}: {
    entry: Entry;
    open: boolean;
    onToggle: () => void;
}) {
    const { t } = useLocale();
    const Icon = entry.icon;
    return (
        <div
            className={`border rounded-xl bg-white transition-shadow ${
                open ? "shadow-sm border-gray-300" : "border-gray-200 hover:shadow-sm"
            }`}
        >
            <button
                type="button"
                onClick={onToggle}
                className="w-full text-left p-4 flex items-start gap-3"
            >
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">
                        {entry.title}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                        {entry.summary}
                    </div>
                </div>
                {entry.open && (
                    <Link
                        href={entry.open}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-blue-600 hover:underline shrink-0"
                    >
                        {t("action.open_arrow")}
                    </Link>
                )}
            </button>
            {open && (
                <div className="px-4 pb-5 ml-12">
                    <Markdown text={entry.body} />
                </div>
            )}
        </div>
    );
}

/**
 * Tiny markdown-ish renderer — handles **bold**, [text](href), bullet
 * lists, paragraphs, and inline `code`. No XSS surface because we only
 * embed text we author ourselves above.
 */
function Markdown({ text }: { text: string }) {
    const lines = text.split("\n");
    const blocks: React.ReactNode[] = [];
    let listBuffer: string[] = [];
    const flushList = () => {
        if (listBuffer.length === 0) return;
        blocks.push(
            <ul
                key={`l-${blocks.length}`}
                className="list-disc pl-5 space-y-1 mb-3 text-sm text-gray-700"
            >
                {listBuffer.map((item, i) => (
                    <li key={i}>
                        <RenderInline text={item} />
                    </li>
                ))}
            </ul>,
        );
        listBuffer = [];
    };
    for (const raw of lines) {
        const line = raw.trim();
        if (!line) {
            flushList();
            continue;
        }
        if (line.startsWith("- ")) {
            listBuffer.push(line.slice(2));
            continue;
        }
        flushList();
        blocks.push(
            <p
                key={`p-${blocks.length}`}
                className="text-sm text-gray-700 mb-3 leading-relaxed"
            >
                <RenderInline text={line} />
            </p>,
        );
    }
    flushList();
    return <div>{blocks}</div>;
}

function RenderInline({ text }: { text: string }) {
    // Order matters: do links first (they may contain ** and `).
    const out: React.ReactNode[] = [];
    let cursor = 0;
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(text))) {
        if (m.index > cursor) {
            out.push(
                <FormatInline
                    key={`t-${cursor}`}
                    text={text.slice(cursor, m.index)}
                />,
            );
        }
        const isExternal = /^https?:\/\//.test(m[2]);
        out.push(
            isExternal ? (
                <a
                    key={`a-${m.index}`}
                    href={m[2]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                >
                    {m[1]}
                </a>
            ) : (
                <Link
                    key={`l-${m.index}`}
                    href={m[2]}
                    className="text-blue-600 hover:underline"
                >
                    {m[1]}
                </Link>
            ),
        );
        cursor = m.index + m[0].length;
    }
    if (cursor < text.length) {
        out.push(<FormatInline key={`t-${cursor}-end`} text={text.slice(cursor)} />);
    }
    return <>{out}</>;
}

function FormatInline({ text }: { text: string }) {
    // **bold** and `code`.
    const parts: React.ReactNode[] = [];
    const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
    let cursor = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
        if (m.index > cursor) parts.push(text.slice(cursor, m.index));
        if (m[2] !== undefined) {
            parts.push(
                <strong key={`b-${m.index}`} className="font-semibold">
                    {m[2]}
                </strong>,
            );
        } else if (m[3] !== undefined) {
            parts.push(
                <code
                    key={`c-${m.index}`}
                    className="text-xs px-1 py-0.5 rounded bg-gray-100 font-mono"
                >
                    {m[3]}
                </code>,
            );
        }
        cursor = m.index + m[0].length;
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return <>{parts}</>;
}
