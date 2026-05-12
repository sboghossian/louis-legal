"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SlidersHorizontal, Search, Check, Sparkles, Library, Repeat, Plug, Key, Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

// SCAFFOLD: ported from haqq-prototype `renderCustomize`. Now wired to the backend.
// CUSTOMIZE fixture in the prototype is ~800 lines of toggle data; this page
// renders a representative subset that exercises every category. Add more toggles by
// extending CATEGORIES below; backend persists any key/enabled pair.

interface CustomizeItem {
    label: string;
    description: string;
    key: string; // unique slug, persisted as-is
}

interface CustomizeCategory {
    title: string;
    items: CustomizeItem[];
}

const CATEGORIES: CustomizeCategory[] = [
    {
        title: "Personas",
        items: [
            { key: "persona.partner",             label: "Partner mode",              description: "Terse, citation-heavy responses for senior lawyers." },
            { key: "persona.associate",           label: "Associate mode",            description: "Drafting-focused with structural rigor." },
            { key: "persona.louis-twin",          label: "Louis Twin (consumer)",     description: "Plain-English assistant for non-lawyers." },
            { key: "persona.junior",              label: "Junior / law student",      description: "Pedagogical, glossed, Socratic." },
            { key: "persona.in-house-counsel",    label: "In-house counsel",          description: "Commercial framing + risk balancing." },
        ],
    },
    {
        title: "Jurisdictions",
        items: [
            { key: "jx.LB",   label: "Lebanon (LB)",       description: "Civil Code + Labor Law + 18 confessional rules." },
            { key: "jx.KSA",  label: "Saudi Arabia (KSA)", description: "Sharia + Royal Decrees + GOSI/MOL." },
            { key: "jx.UAE",  label: "UAE Federal",        description: "Federal Decree-Laws + Cabinet Decisions." },
            { key: "jx.DIFC", label: "DIFC",               description: "Common-law overlay, English-language." },
            { key: "jx.ADGM", label: "ADGM",               description: "Common-law overlay, English-language." },
            { key: "jx.EG",   label: "Egypt",              description: "Civil Code + Investment Law." },
            { key: "jx.FR",   label: "France",             description: "Code civil + Code de commerce." },
            { key: "jx.UK",   label: "United Kingdom",     description: "Common law + Companies Act 2006." },
            { key: "jx.US",   label: "United States",      description: "Delaware / NY / federal." },
        ],
    },
    {
        title: "Tools",
        items: [
            { key: "tool.legal-data-hunter",        label: "Legal Data Hunter",        description: "6.3M laws / 18M cases / 50+ jurisdictions." },
            { key: "tool.web-search",                label: "Web search",                description: "For recent amendments and rulings." },
            { key: "tool.calc-eosg",                 label: "End-of-service calculator", description: "Per-jurisdiction EOSG/EOSA computation." },
            { key: "tool.calc-interest",             label: "Statutory interest calc",   description: "Compute civil/commercial interest." },
            { key: "tool.ocr-arabic",                label: "OCR (Arabic)",              description: "Extract text from scanned Arabic PDFs." },
            { key: "tool.tawqi3i",                   label: "Tawqi3i e-signature",      description: "Lebanese cross-border e-signature bridge." },
        ],
    },
    {
        title: "Safety",
        items: [
            { key: "safety.pii-redaction",                 label: "PII redaction before RAG",     description: "Replace names/IDs with placeholders before indexing." },
            { key: "safety.heppner-disclaimer",            label: "AI-not-privileged disclaimer",  description: "Per US Heppner ruling, surface to lawyer users." },
            { key: "safety.refuse-criminal-facilitation",  label: "Refuse criminal facilitation",  description: "Block requests to evade law." },
            { key: "safety.cross-tenant-isolation",        label: "Cross-tenant isolation",        description: "Hard partition between workspaces." },
        ],
    },
    {
        title: "Output formatting",
        items: [
            { key: "output.IRAC",                  label: "IRAC structure",      description: "Issue / Rule / Application / Conclusion." },
            { key: "output.executive-summary-first", label: "Executive summary first", description: "BLUF — bottom line up front." },
            { key: "output.inline-citations",      label: "Inline citations",    description: "Pin-cite statutes and cases inline." },
            { key: "output.bilingual",             label: "Bilingual (AR/EN)",   description: "Side-by-side bilingual drafting." },
            { key: "output.mobile-short",          label: "Mobile short format", description: "≤300 words for mobile surfaces." },
        ],
    },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export default function CustomizePage() {
    const [settings, setSettings] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [savedKey, setSavedKey] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [unauthed, setUnauthed] = useState(false);

    // Load
    useEffect(() => {
        (async () => {
            try {
                const headers = await authHeaders();
                if (!headers.Authorization) {
                    setUnauthed(true);
                    setLoading(false);
                    return;
                }
                const r = await fetch(`${API_BASE}/api/customize`, { headers, cache: "no-store" });
                if (r.status === 401) { setUnauthed(true); return; }
                if (r.ok) {
                    const json = await r.json();
                    setSettings(json.settings ?? {});
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const toggle = useCallback(async (key: string) => {
        const next = !settings[key];
        setSettings(prev => ({ ...prev, [key]: next }));
        setSavingKey(key);
        try {
            const headers = await authHeaders();
            await fetch(`${API_BASE}/api/customize/${encodeURIComponent(key)}`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: next }),
            });
            setSavedKey(key);
            setTimeout(() => setSavedKey(k => k === key ? null : k), 1200);
        } catch (e) {
            // revert on failure
            setSettings(prev => ({ ...prev, [key]: !next }));
            console.error(e);
        } finally {
            setSavingKey(null);
        }
    }, [settings]);

    const needle = q.trim().toLowerCase();
    const filtered = needle
        ? CATEGORIES.map(cat => ({ ...cat, items: cat.items.filter(i => (i.label + " " + i.description + " " + i.key).toLowerCase().includes(needle)) })).filter(c => c.items.length)
        : CATEGORIES;

    return (
        <div className="max-w-5xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <SlidersHorizontal className="w-6 h-6" />
                <h1 className="text-2xl font-serif font-semibold">Customize</h1>
            </div>
            <p className="text-sm text-gray-600 mb-8">
                Configure every layer of Louis: how it thinks (Skills + Workflows), what it can reach (Integrations + API Keys),
                what it runs on a schedule (Routines), and how it talks to you (Preferences below).
            </p>

            {/* Hub cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
                <HubCard href="/skills" icon={Sparkles} title="Skills" desc="982 skills · authoring + observability" />
                <HubCard href="/workflows" icon={Library} title="Workflows" desc="Reusable multi-turn flows" />
                <HubCard href="/routines" icon={Repeat} title="Routines" desc="Scheduled AI tasks · digests · alerts" />
                <HubCard href="/integrations" icon={Plug} title="Integrations" desc="OpenClaw · MCP servers · 32 connectors" />
                <HubCard href="/settings/api-keys" icon={Key} title="API Keys" desc="Bring your own Claude · GPT · Gemini · …" />
                <HubCard href="/settings" icon={SettingsIcon} title="Account" desc="Profile · billing · team · data · security" />
            </div>

            <div className="border-t border-[color:var(--louis-rule)] my-8" />

            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-serif">Preferences</h2>
            </div>
            <p className="text-sm text-gray-600 mb-6">
                Personas, jurisdictions, tools, safety, and output formatting — persisted per user.
            </p>

            {unauthed && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-900">
                    You&apos;re not signed in — toggles will not persist. <a href="/login" className="underline">Sign in</a>.
                </div>
            )}

            <div className="relative mb-8">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search preferences…" className="pl-9" />
            </div>

            {loading ? (
                <div className="text-sm text-gray-500">loading…</div>
            ) : (
                <div className="space-y-8">
                    {filtered.map(cat => (
                        <section key={cat.title}>
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{cat.title}</h2>
                            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                                {cat.items.map(item => {
                                    const isEnabled = !!settings[item.key];
                                    const isSaving = savingKey === item.key;
                                    const justSaved = savedKey === item.key;
                                    return (
                                        <label key={item.key} className="flex items-start gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                disabled={isSaving || unauthed}
                                                onChange={() => toggle(item.key)}
                                                className="mt-0.5 accent-gray-900"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-gray-900">{item.label}</span>
                                                    {justSaved && <Check className="w-3.5 h-3.5 text-green-600" />}
                                                    {isSaving && <span className="text-[10px] text-gray-400">saving…</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.key}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
}

function HubCard({ href, icon: Icon, title, desc }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
    return (
        <Link
            href={href}
            className="group relative border border-[color:var(--louis-rule)] rounded-lg p-4 bg-white hover:border-gray-900 hover:shadow-sm transition flex flex-col"
        >
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-gray-700" />
                <span className="font-medium text-sm">{title}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-gray-900 transition" />
            </div>
            <span className="text-xs text-gray-500">{desc}</span>
        </Link>
    );
}
