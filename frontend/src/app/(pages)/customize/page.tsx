"use client";

/**
 * Customize — the single hub for everything that shapes Louis's behavior.
 *
 * Modeled on the HAQQ prototype design (see screenshot in the repo notes):
 *   ─ Search bar across the whole hub
 *   ─ Tabs: All · Sources · Tools · Jurisdictions · Skills · Vault (with counts)
 *   ─ Per-section header with an "Add" button
 *   ─ Cards: icon | title | description | on/off toggle
 *
 * Each item carries a unique `key` slug ("source.westlaw", "tool.ms-365", …)
 * which is what /api/customize persists. The frontend stores the on/off
 * state, the backend handles the toggle; missing-column degradation is
 * handled by /user/profile.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    SlidersHorizontal,
    Search,
    Plus,
    Globe,
    BookOpen,
    Flag,
    Scale,
    FileText,
    Building2,
    Database,
    Lock,
    Sparkles,
    Library,
    Plug,
    Repeat,
    type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

async function authHeaders(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

type CategoryId = "sources" | "tools" | "jurisdictions" | "skills" | "vault";

interface CustomizeItem {
    key: string;
    label: string;
    description: string;
    icon?: LucideIcon;
    defaultOn?: boolean;
}

interface Category {
    id: CategoryId;
    label: string;
    icon: LucideIcon;
    items: CustomizeItem[];
}

const SOURCES: CustomizeItem[] = [
    { key: "source.world-jurisdictions",  label: "World Jurisdictions",   icon: Globe,    defaultOn: true,
      description: "Global legal database covering 190+ countries with primary law texts." },
    { key: "source.arab-legal-db",        label: "Arab Legal DB",         icon: BookOpen, defaultOn: true,
      description: "Arab world legislation, court decisions, and legal commentary." },
    { key: "source.eurlex",               label: "EUR-Lex",               icon: Flag,     defaultOn: true,
      description: "EU directives, regulations, treaties, and CJEU case law." },
    { key: "source.google-scholar-legal", label: "Google Scholar Legal",  icon: Search,   defaultOn: true,
      description: "Free case law and legal journals search across US, UK, and more." },
    { key: "source.cornell-lii",          label: "Cornell LII",           icon: BookOpen, defaultOn: true,
      description: "Free US law, CFR, and Supreme Court opinions." },
    { key: "source.westlaw",              label: "Westlaw / CoCounsel",   icon: BookOpen,
      description: "Thomson Reuters legal research with AI-powered CoCounsel." },
    { key: "source.lexisnexis",           label: "LexisNexis / Lexis+ AI", icon: BookOpen,
      description: "Legal research with Lexis+ AI, Protégé, and Shepard's." },
    { key: "source.practical-law",        label: "Practical Law",         icon: BookOpen,
      description: "Practice notes, standard documents, checklists, and toolkits." },
    { key: "source.bloomberg-law",        label: "Bloomberg Law",         icon: Database,
      description: "AI brief analysis, real-time legislative monitoring, citator." },
    { key: "source.vlex-vincent",         label: "vLex / Vincent AI",     icon: BookOpen,
      description: "1B+ documents across 17 countries with cross-jurisdiction search." },
    { key: "source.heinonline",           label: "HeinOnline",            icon: BookOpen,
      description: "Legal journals, law reviews, treaties, and historical legal content." },
    { key: "source.courtlistener",        label: "CourtListener",         icon: Scale,
      description: "9M+ US court opinions with free API access and RECAP archive." },
    { key: "source.pacer-recap",          label: "PACER / RECAP",         icon: Scale,
      description: "US federal court dockets, filings, and the largest open archive." },
    { key: "source.caselaw-access",       label: "Caselaw Access Project", icon: Scale,
      description: "6.9M US court decisions from Harvard Law School, free and open." },
    { key: "source.hudoc-echr",           label: "HUDOC (ECHR)",          icon: Scale,
      description: "European Court of Human Rights judgments and decisions." },
    { key: "source.curia-cjeu",           label: "CURIA (CJEU)",          icon: Scale,
      description: "Court of Justice of the EU and General Court case law." },
    { key: "source.bailii",               label: "BAILII",                icon: BookOpen,
      description: "Free access to British and Irish primary legal materials." },
    { key: "source.indian-kanoon",        label: "Indian Kanoon",         icon: Scale,
      description: "Indian court judgments, statutes, and legal documents." },
    { key: "source.judilibre",            label: "Judilibre",             icon: BookOpen,
      description: "French Cour de Cassation open API with anonymized judgments." },
    { key: "source.legifrance",           label: "Légifrance",            icon: BookOpen,
      description: "Official French legal portal — all statutes, regulations, codes." },
    { key: "source.legislation-uk",       label: "Legislation.gov.uk",    icon: BookOpen,
      description: "Full text of UK Acts of Parliament and statutory instruments." },
    { key: "source.gesetze-im-internet",  label: "Gesetze im Internet",   icon: BookOpen,
      description: "Official German federal law portal covering all statutes." },
    { key: "source.us-code-ecfr",         label: "US Code / eCFR",        icon: BookOpen,
      description: "US federal statutes and Code of Federal Regulations." },
    { key: "source.sec-edgar",            label: "SEC EDGAR",             icon: Database,
      description: "SEC corporate filings, annual reports, and proxy statements." },
    { key: "source.wipo-lex",             label: "WIPO Lex",              icon: BookOpen,
      description: "Global database of IP laws, treaties, and selected case decisions." },
    { key: "source.worldlii",             label: "WorldLII",              icon: Globe,
      description: "2,000+ legal databases across 200+ jurisdictions." },
    { key: "source.canlii",               label: "CanLII",                icon: Scale,
      description: "Canadian Legal Information Institute." },
    { key: "source.austlii",              label: "AustLII",               icon: Scale,
      description: "Australasian legal information." },
    { key: "source.uae-legislation",      label: "UAE Legislation",       icon: BookOpen,
      description: "UAE federal and emirate-level legislation." },
    { key: "source.ncar-saudi",           label: "NCAR (Saudi Arabia)",   icon: BookOpen,
      description: "Saudi regulations, agreements, and treaties." },
    { key: "source.lloc-bahrain",         label: "LLOC (Bahrain)",        icon: BookOpen,
      description: "Bahraini legislation and legal library." },
    { key: "source.knesset-israel",       label: "Knesset (Israel)",      icon: BookOpen,
      description: "Israeli legislation and parliamentary materials." },
];

const TOOLS: CustomizeItem[] = [
    { key: "tool.ms-365",         label: "Microsoft 365",       defaultOn: true,
      description: "Word, Excel, SharePoint, Outlook integration." },
    { key: "tool.ms-sharepoint",  label: "Microsoft SharePoint", defaultOn: true,
      description: "Document management and team libraries." },
    { key: "tool.ms-word",        label: "Microsoft Word",       defaultOn: true,
      description: "Document editing add-in — drafting, redlining." },
    { key: "tool.ms-excel",        label: "Microsoft Excel",
      description: "Spreadsheet integration for tabular review export." },
    { key: "tool.ms-outlook",      label: "Microsoft Outlook",
      description: "Email integration, calendar, contacts." },
    { key: "tool.ms-teams",        label: "Microsoft Teams",
      description: "Chat + meetings integration." },
    { key: "tool.google-workspace", label: "Google Workspace",
      description: "Docs, Sheets, Drive, Gmail, Calendar." },
    { key: "tool.google-drive",    label: "Google Drive",
      description: "Cloud file storage + collaborative editing." },
    { key: "tool.google-docs",     label: "Google Docs",
      description: "Document editing add-on for drafting + comments." },
    { key: "tool.gmail",            label: "Gmail",
      description: "Email integration for client communication." },
    { key: "tool.google-calendar", label: "Google Calendar",
      description: "Deadline + matter event sync." },
    { key: "tool.slack",            label: "Slack",
      description: "Team chat with deal-room and matter channels." },
    { key: "tool.notion",           label: "Notion",
      description: "Knowledge base + matter docs." },
    { key: "tool.linear",           label: "Linear",
      description: "Issue tracking for legal-ops tasks." },
    { key: "tool.github",           label: "GitHub",
      description: "Sync drafted skills back to repos." },
    { key: "tool.figma",            label: "Figma",
      description: "Pull design context into legal-product reviews." },
    { key: "tool.tawqi3i",         label: "Tawqi3i",
      description: "Lebanese cross-border e-signature." },
    { key: "tool.docusign",         label: "DocuSign",
      description: "E-signature, contract lifecycle, CLM integration." },
    { key: "tool.adobe-sign",       label: "Adobe Acrobat Sign",
      description: "E-signature + PDF tooling." },
    { key: "tool.uae-pass",         label: "UAE Pass",
      description: "Digital identity for UAE filings + signatures." },
    { key: "tool.dropbox-sign",     label: "Dropbox Sign",
      description: "E-signature for high-volume routines." },
    { key: "tool.stripe",           label: "Stripe",
      description: "Billing + invoicing for client engagements." },
    { key: "tool.quickbooks",       label: "QuickBooks",
      description: "Accounting + matter cost ledger." },
    { key: "tool.xero",             label: "Xero",
      description: "Accounting + invoicing alternative." },
    { key: "tool.hubspot",          label: "HubSpot CRM",
      description: "Client + matter CRM, marketing automation." },
    { key: "tool.salesforce",       label: "Salesforce",
      description: "Enterprise CRM with Industry Cloud for Legal." },
    { key: "tool.openclaw",         label: "OpenClaw",
      description: "Free, self-hosted matter management — Louis-native." },
    { key: "tool.cocounsel",        label: "Thomson Reuters CoCounsel",
      description: "TR's AI brief assistant — bridge from Louis to CoCounsel." },
    { key: "tool.harvey-bridge",    label: "Harvey AI (bridge)",
      description: "Read-only bridge to Harvey workspaces (if licensed)." },
    { key: "tool.spellbook-bridge", label: "Spellbook (bridge)",
      description: "Pull Spellbook redlines into Louis matters." },
    { key: "tool.legora-bridge",    label: "Legora (bridge)",
      description: "Read-only bridge from Legora drafting docs." },
    { key: "tool.calc-eosg",        label: "End-of-service calculator", defaultOn: true,
      description: "Per-jurisdiction EOSG/EOSA computation (GCC × 6)." },
    { key: "tool.calc-interest",    label: "Statutory interest calc", defaultOn: true,
      description: "Compute civil/commercial interest by jurisdiction." },
    { key: "tool.ocr-arabic",       label: "OCR (Arabic)",
      description: "Extract text from scanned Arabic PDFs." },
    { key: "tool.web-search",       label: "Web search",
      description: "For recent amendments + rulings + product launches." },
    { key: "tool.firecrawl",        label: "Firecrawl",
      description: "High-fidelity web crawl + extraction." },
    { key: "tool.legal-data-hunter", label: "Legal Data Hunter",
      description: "6.3M laws / 18M cases / 50+ jurisdictions." },
    { key: "tool.mcp-server",       label: "MCP Server",
      description: "Expose Louis's tools to any MCP client (Claude, Cursor, …)." },
    { key: "tool.whatsapp",         label: "WhatsApp",
      description: "Client comms via WhatsApp Business API." },
    { key: "tool.posthog",          label: "PostHog",
      description: "Product analytics for in-house teams." },
    { key: "tool.cloudflare",       label: "Cloudflare",
      description: "Custom domain, R2 storage, Workers." },
    { key: "tool.resend",           label: "Resend",
      description: "Transactional email for matter notifications." },
    { key: "tool.zapier",           label: "Zapier",
      description: "5,000+ no-code triggers + actions." },
    { key: "tool.make",             label: "Make (Integromat)",
      description: "Visual no-code automation." },
    { key: "tool.companies-house",  label: "Companies House (UK)",
      description: "UK corporate registry lookups." },
    { key: "tool.ofac-sanctions",   label: "OFAC sanctions",
      description: "Sanctions list screening for KYC." },
];

const JURISDICTIONS: CustomizeItem[] = [
    // GCC
    { key: "jx.UAE",   label: "United Arab Emirates (Federal)", defaultOn: true, description: "Federal Decree-Laws + Cabinet Decisions." },
    { key: "jx.DIFC",  label: "DIFC", defaultOn: true, description: "Common-law overlay, English-language." },
    { key: "jx.ADGM",  label: "ADGM", defaultOn: true, description: "Common-law overlay, English-language." },
    { key: "jx.KSA",   label: "Saudi Arabia (KSA)", defaultOn: true, description: "Sharia + Royal Decrees + GOSI/MOL." },
    { key: "jx.QA",    label: "Qatar", description: "Civil + QFC common-law overlay." },
    { key: "jx.BH",    label: "Bahrain", description: "Civil with commercial regulations." },
    { key: "jx.KW",    label: "Kuwait", description: "Civil Code + Commercial Companies Law." },
    { key: "jx.OM",    label: "Oman", description: "Civil + Royal Decrees." },
    // Levant / MENA
    { key: "jx.LB",    label: "Lebanon", defaultOn: true, description: "Civil Code + Labor Law + 18 confessional rules." },
    { key: "jx.EG",    label: "Egypt", description: "Civil Code + Investment Law." },
    { key: "jx.JO",    label: "Jordan", description: "Civil + Commercial Code." },
    { key: "jx.IQ",    label: "Iraq", description: "Civil + investment regulations." },
    { key: "jx.MA",    label: "Morocco", description: "Civil law + Code of Obligations." },
    { key: "jx.TN",    label: "Tunisia", description: "Civil + Commercial Code." },
    { key: "jx.DZ",    label: "Algeria", description: "Civil + Commercial Code." },
    { key: "jx.IL",    label: "Israel", description: "Mixed common-civil + Knesset legislation." },
    { key: "jx.TR",    label: "Türkiye", description: "Civil + Commercial Code." },
    // Europe
    { key: "jx.UK",    label: "United Kingdom", description: "Common law + Companies Act 2006." },
    { key: "jx.FR",    label: "France", description: "Code civil + Code de commerce." },
    { key: "jx.DE",    label: "Germany", description: "BGB + HGB + GmbHG." },
    { key: "jx.IT",    label: "Italy", description: "Codice civile + Codice del lavoro." },
    { key: "jx.ES",    label: "Spain", description: "Código Civil + Ley de Sociedades de Capital." },
    { key: "jx.PT",    label: "Portugal", description: "Civil + commercial." },
    { key: "jx.NL",    label: "Netherlands", description: "BW + Wetboek van Koophandel." },
    { key: "jx.BE",    label: "Belgium", description: "Civil + commercial." },
    { key: "jx.CH",    label: "Switzerland", description: "OR + ZGB." },
    { key: "jx.LU",    label: "Luxembourg", description: "Civil + commercial." },
    { key: "jx.IE",    label: "Ireland", description: "Common law." },
    { key: "jx.EU",    label: "EU law", description: "Treaties + regulations + directives." },
    // North America
    { key: "jx.US",    label: "United States — federal", description: "USC + CFR + SCOTUS." },
    { key: "jx.US-DE", label: "Delaware", description: "DGCL + Chancery." },
    { key: "jx.US-NY", label: "New York", description: "NY BCL + Commercial." },
    { key: "jx.US-CA", label: "California", description: "Corp Code + Labor Code + CCPA." },
    { key: "jx.CA",    label: "Canada (federal)", description: "Canada Business Corporations Act." },
    { key: "jx.CA-ON", label: "Ontario", description: "OBCA + Securities." },
    { key: "jx.CA-QC", label: "Québec (civil)", description: "Civil Code of Québec." },
    // APAC
    { key: "jx.SG",    label: "Singapore", description: "Common law + Companies Act." },
    { key: "jx.HK",    label: "Hong Kong", description: "Common law + Companies Ordinance." },
    { key: "jx.IN",    label: "India", description: "Companies Act 2013 + Contract Act." },
    { key: "jx.AU",    label: "Australia", description: "Corporations Act 2001." },
    { key: "jx.NZ",    label: "New Zealand", description: "Companies Act 1993." },
    { key: "jx.JP",    label: "Japan", description: "Civil + Commercial Code." },
];

const VAULT: CustomizeItem[] = [
    { key: "vault.encrypted-store",    label: "Encrypted vault store", icon: Lock, defaultOn: true,
      description: "AES-256 at rest for any document tagged as Vault." },
    { key: "vault.privileged-folder",  label: "Privileged-only folder",
      description: "Hidden from skill router unless explicitly opted in per chat." },
    { key: "vault.client-isolation",   label: "Per-client isolation", defaultOn: true,
      description: "Cross-client access requires an explicit conflict-check override." },
    { key: "vault.expiring-shares",    label: "Expiring shares",
      description: "Vault documents shared externally auto-expire after 7 days." },
    { key: "vault.audit-log",          label: "Audit log every access",
      description: "Every Vault read is logged; downloadable per matter." },
    { key: "vault.byo-encryption-key", label: "BYO encryption key",
      description: "Use your firm's KMS key instead of the platform key." },
    { key: "vault.matter-quarantine",  label: "Matter quarantine on conflict",
      description: "Auto-quarantine a matter when a conflict-of-interest is detected." },
    { key: "vault.read-receipts",      label: "Read receipts to client",
      description: "Notify the client when their privileged docs are accessed by anyone outside the firm." },
    { key: "vault.retention-policy",   label: "Retention policy hooks",
      description: "Auto-delete or archive Vault docs per firm retention policy." },
];

const CATEGORIES_META: { id: CategoryId; label: string; icon: LucideIcon }[] = [
    { id: "sources",       label: "Sources",       icon: Database },
    { id: "tools",         label: "Tools",         icon: Plug },
    { id: "jurisdictions", label: "Jurisdictions", icon: Globe },
    { id: "skills",        label: "Skills",        icon: Sparkles },
    { id: "vault",         label: "Vault",         icon: Lock },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CustomizePage() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | CategoryId>("all");
    const [unauthed, setUnauthed] = useState(false);
    const [skills, setSkills] = useState<CustomizeItem[]>([]);

    // Load both user settings + a thin slice of the skill registry to
    // populate the Skills tab.
    useEffect(() => {
        (async () => {
            try {
                const headers = await authHeaders();
                if (!headers.Authorization) {
                    setUnauthed(true);
                } else {
                    const r = await fetch(`${API_BASE}/api/customize`, {
                        headers,
                        cache: "no-store",
                    });
                    if (r.status === 401) {
                        setUnauthed(true);
                    } else if (r.ok) {
                        const json = await r.json();
                        setSettings(json.settings ?? {});
                    }
                }
            } catch (e) {
                console.error(e);
            }

            // Skills: load a curated subset for the toggles hub. Every skill
            // in the registry is currently at status="drafted" (the
            // "shipped" label is reserved for a later editorial pass), so
            // we DON'T filter by status — that was leaving the hub empty.
            // Instead we sort by priority (P0/P1 first), prefer the
            // top-level routing categories (heuristic/persona/safety/
            // output/draft/review), and cap at the 48 highest-leverage
            // entries — matching the count shown in the HAQQ screenshot.
            try {
                const r = await fetch(`${API_BASE}/api/skills`);
                if (r.ok) {
                    const json = await r.json();
                    const entries = (json.entries ?? []) as {
                        id: string;
                        name: string;
                        category: string;
                        priority?: string;
                    }[];
                    const TOP_CATS = new Set([
                        "heuristic",
                        "persona",
                        "safety",
                        "output",
                        "draft",
                        "review",
                        "research",
                        "conversation",
                    ]);
                    const PRIO_RANK: Record<string, number> = {
                        P0: 0,
                        P1: 1,
                        P2: 2,
                        P3: 3,
                    };
                    const ranked = entries
                        .map((e) => ({
                            entry: e,
                            score:
                                (PRIO_RANK[e.priority ?? "P3"] ?? 3) * 10 +
                                (TOP_CATS.has(e.category) ? 0 : 5),
                        }))
                        .sort((a, b) => a.score - b.score)
                        .slice(0, 48)
                        .map(({ entry }) => ({
                            key: `skill.${entry.id}`,
                            label: entry.name || entry.id,
                            description: `${entry.category} skill`,
                            icon: Sparkles,
                        }));
                    setSkills(ranked);
                }
            } catch {
                /* registry unreachable — leave empty */
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const toggle = useCallback(
        async (key: string) => {
            const next = !settings[key];
            setSettings((prev) => ({ ...prev, [key]: next }));
            setSavingKey(key);
            try {
                const headers = await authHeaders();
                const r = await fetch(
                    `${API_BASE}/api/customize/${encodeURIComponent(key)}`,
                    {
                        method: "POST",
                        headers: { ...headers, "Content-Type": "application/json" },
                        body: JSON.stringify({ enabled: next }),
                    },
                );
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
            } catch (e) {
                // Revert on failure + tell the user.
                setSettings((prev) => ({ ...prev, [key]: !next }));
                console.error(e);
                toast({
                    title: "Couldn't save toggle",
                    description: e instanceof Error ? e.message : String(e),
                    variant: "error",
                });
            } finally {
                setSavingKey(null);
            }
        },
        [settings, toast],
    );

    const categories: Category[] = useMemo(
        () => [
            { id: "sources",       label: "Sources",       icon: Database, items: SOURCES },
            { id: "tools",         label: "Tools",         icon: Plug,     items: TOOLS },
            { id: "jurisdictions", label: "Jurisdictions", icon: Globe,    items: JURISDICTIONS },
            { id: "skills",        label: "Skills",        icon: Sparkles, items: skills },
            { id: "vault",         label: "Vault",         icon: Lock,     items: VAULT },
        ],
        [skills],
    );

    const needle = q.trim().toLowerCase();
    const matchesQuery = (i: CustomizeItem): boolean => {
        if (!needle) return true;
        return (
            i.label.toLowerCase().includes(needle) ||
            i.description.toLowerCase().includes(needle) ||
            i.key.toLowerCase().includes(needle)
        );
    };

    const filteredByCat = useMemo(
        () =>
            categories
                .map((c) => ({ ...c, items: c.items.filter(matchesQuery) }))
                .filter((c) => c.items.length > 0),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [categories, needle],
    );

    const totalCount = categories.reduce((s, c) => s + c.items.length, 0);
    const counts = Object.fromEntries(
        categories.map((c) => [c.id, c.items.length]),
    ) as Record<CategoryId, number>;

    const isOn = (item: CustomizeItem) =>
        item.key in settings ? settings[item.key] : !!item.defaultOn;

    return (
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8">
            <div className="flex items-center gap-2 mb-2">
                <SlidersHorizontal className="w-6 h-6" />
                <h1 className="text-2xl font-serif font-semibold">Customize</h1>
            </div>
            <p className="text-sm text-gray-600 mb-6 max-w-2xl">
                Enable, upload, or create the components that shape your AI&apos;s
                behavior.
            </p>

            <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search across sources, tools, skills, jurisdictions…"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                />
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
                <TabButton
                    label="All"
                    count={totalCount}
                    active={activeTab === "all"}
                    onClick={() => setActiveTab("all")}
                />
                {CATEGORIES_META.map((c) => (
                    <TabButton
                        key={c.id}
                        label={c.label}
                        count={counts[c.id] ?? 0}
                        active={activeTab === c.id}
                        onClick={() => setActiveTab(c.id)}
                    />
                ))}
            </div>

            {unauthed && (
                <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-900">
                    You&apos;re not signed in — toggles will not persist.{" "}
                    <a href="/login" className="underline">
                        Sign in
                    </a>
                    .
                </div>
            )}

            {loading && (
                <div className="text-sm text-gray-500 py-12 text-center">
                    Loading…
                </div>
            )}

            {!loading && filteredByCat.length === 0 && (
                <div className="text-sm text-gray-500 py-12 text-center">
                    Nothing matches "{q}". Try clearing the search.
                </div>
            )}

            {!loading &&
                filteredByCat
                    .filter((c) => activeTab === "all" || activeTab === c.id)
                    .map((cat) => {
                        const Icon = cat.icon;
                        return (
                            <section key={cat.id} className="mb-10">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-gray-700" />
                                        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                                            {cat.label}
                                        </h2>
                                        <span className="text-xs text-gray-400">
                                            {cat.items.length}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900"
                                        title={`Request a new ${cat.label.toLowerCase().replace(/s$/, "")}`}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {cat.items.map((item) => (
                                        <ItemCard
                                            key={item.key}
                                            item={item}
                                            on={isOn(item)}
                                            saving={savingKey === item.key}
                                            onToggle={() => toggle(item.key)}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}

            {/* Footer hub: quick links to surfaces that aren't toggles */}
            <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                    Related surfaces
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FooterLink href="/skills" icon={Sparkles} label="Skills authoring" />
                    <FooterLink href="/workflows" icon={Library} label="Workflows" />
                    <FooterLink href="/routines" icon={Repeat} label="Routines" />
                    <FooterLink href="/integrations" icon={Plug} label="Integration hub" />
                </div>
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

function ItemCard({
    item,
    on,
    saving,
    onToggle,
}: {
    item: CustomizeItem;
    on: boolean;
    saving: boolean;
    onToggle: () => void;
}) {
    const Icon = item.icon ?? FileText;
    return (
        <div
            className={`border rounded-xl p-3 bg-white flex items-start gap-3 transition-shadow hover:shadow-sm ${
                on ? "border-gray-300" : "border-gray-200"
            }`}
        >
            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">
                    {item.label}
                </div>
                <div
                    className="text-xs text-gray-500 mt-0.5"
                    style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                    {item.description}
                </div>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={onToggle}
                disabled={saving}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors ${
                    on
                        ? "bg-gray-900 border-gray-900"
                        : "bg-gray-200 border-gray-300"
                } ${saving ? "opacity-60" : ""}`}
            >
                <span
                    className={`pointer-events-none absolute top-0.5 left-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        on ? "translate-x-4" : "translate-x-0"
                    }`}
                />
            </button>
        </div>
    );
}

function FooterLink({
    href,
    icon: Icon,
    label,
}: {
    href: string;
    icon: LucideIcon;
    label: string;
}) {
    return (
        <a
            href={href}
            className="border border-gray-200 rounded-lg p-3 bg-white hover:border-gray-400 hover:shadow-sm transition flex items-center gap-2"
        >
            <Icon className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">{label}</span>
        </a>
    );
}
