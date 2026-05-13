"use client";

import { useEffect, useState } from "react";
import {
    Settings as SettingsIcon, User, CreditCard, Users as TeamIcon,
    Database, Plug, Bell, Shield, ChevronRight, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppearanceTab } from "./AppearanceTab";

// Settings hub. Tabs: Profile · Models & API Keys · Billing · Team · Data ·
// Integrations · Notifications · Security. Cross-links to dedicated pages
// (/account, /customize, /skills) where deeper config lives.

type Tab = "profile" | "appearance" | "models" | "billing" | "team" | "data" | "integrations" | "notifications" | "security";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "profile",       label: "Profile",          icon: User },
    { id: "appearance",    label: "Appearance",       icon: Palette },
    { id: "models",        label: "Models & API Keys", icon: Plug },
    { id: "billing",       label: "Billing & Plan",   icon: CreditCard },
    { id: "team",          label: "Team",             icon: TeamIcon },
    { id: "data",          label: "Data",             icon: Database },
    { id: "integrations",  label: "Integrations",     icon: Plug },
    { id: "notifications", label: "Notifications",    icon: Bell },
    { id: "security",      label: "Security",         icon: Shield },
];

export default function SettingsPage() {
    const [tab, setTab] = useState<Tab>("profile");

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left nav */}
            <div className="w-[240px] flex-shrink-0 border-r border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <SettingsIcon className="w-4 h-4" />
                    <h1 className="font-semibold text-sm">Settings</h1>
                </div>
                <nav className="space-y-1">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 ${tab === t.id ? "bg-gray-100 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                            <t.icon className="w-3.5 h-3.5" />
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Right pane */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
                <h2 className="text-lg font-semibold mb-1">{TABS.find(t => t.id === tab)?.label}</h2>
                <p className="text-xs text-gray-500 mb-6">Configure {tab}.</p>

                {tab === "profile" && <ProfileTab />}
                {tab === "appearance" && <AppearanceTab />}
                {tab === "models" && <ModelsTab />}
                {tab === "billing" && <BillingTab />}
                {tab === "team" && <TeamTab />}
                {tab === "data" && <DataTab />}
                {tab === "integrations" && <IntegrationsTab />}
                {tab === "notifications" && <NotificationsTab />}
                {tab === "security" && <SecurityTab />}
            </div>
        </div>
    );
}

function ProfileTab() {
    return (
        <div className="space-y-4">
            <Card title="Display name" value="Stephane Boghossian" cta="Change" href="/account" />
            <Card title="Email" value="stephane.boghossian@haqq.ai" sub="Verified" />
            <Card title="Organisation" value="HAQQ" cta="Change" href="/account" />
            <Card title="Workspace" value="HAQQ — Beirut · Partner" />
            <Card title="Language preference" value="English (auto-detect input)" cta="Change" />
            <Note>Profile + identity management is in <a href="/account" className="underline">/account</a>.</Note>
        </div>
    );
}

function ModelsTab() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-700">
                API keys + provider management has its own dedicated page with live state, masked keys, and per-provider defaults.
            </p>
            <a href="/settings/api-keys" className="block border border-gray-200 rounded-lg p-4 hover:border-gray-900 transition">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-sm">Open API Keys</div>
                        <div className="text-xs text-gray-500">Add Claude · OpenAI · Gemini · Voyage · 9 more providers</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
            </a>
            <Note>
                The skill router defaults to Gemini Flash for intent classification (cheap + fast).
                Override via env <code>SKILLS_CLASSIFIER_MODEL</code>.
            </Note>
        </div>
    );
}

function BillingTab() {
    const PLANS = [
        { name: "Free",     price: "$0",      desc: "BYO API keys · all features" },
        { name: "Starter",  price: "$19/mo",  desc: "Hosted models · 25k credits" },
        { name: "Pro",      price: "$49/mo",  desc: "Hosted models · 100k credits · matter mgmt" },
        { name: "Business", price: "$199/mo", desc: "Team seats · e-Firm · SSO" },
    ];
    return (
        <div className="space-y-4">
            <Card title="Current plan" value="Free (BYO keys)" sub="Connect a Stripe integration in /integrations to enable hosted plans" />
            <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">Plans</h3>
                <div className="grid grid-cols-4 gap-3">
                    {PLANS.map(p => (
                        <div key={p.name} className="border border-gray-200 rounded p-3">
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-lg font-semibold mt-1">{p.price}</div>
                            <div className="text-[10px] text-gray-500 mt-1">{p.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
            <Note>
                When Stripe is connected, this tab shows live plan, credit balance, next billing, and an &ldquo;Open Stripe portal&rdquo; button. See <a href="/integrations" className="underline">/integrations</a>.
            </Note>
        </div>
    );
}

function TeamTab() {
    return (
        <div className="space-y-4">
            <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-sm text-gray-500">
                <div className="font-medium text-gray-700 mb-1">No team yet</div>
                <div className="mb-4">Invite collaborators to share matters, skills, and routines.</div>
                <Button size="sm" variant="outline">Invite team member</Button>
            </div>
            <Note>Team + role-based permissions ship on the Business plan. Single-user is free.</Note>
        </div>
    );
}

function DataTab() {
    return (
        <div className="space-y-4">
            <Card title="Document storage" value="Cloudflare R2 — bucket: louis" sub="See docs/STORAGE_SETUP.md" />
            <Card title="Database region" value="Supabase · eu-west-1" />
            <Card title="Data retention" value="Indefinite (per matter)" cta="Configure" />
            <LegalDataHunterCard />
            <Card title="Export my data" value="Download a JSON archive of your chats, projects, settings" cta="Export" />
            <Card title="Delete account" value="Permanently delete account + all data" cta="Delete" href="/account" />
        </div>
    );
}

/**
 * Legal-data-hunter — user-supplied API keys for legal-data sources
 * (Westlaw, Lexis, EUR-Lex, CourtListener, CASEMine, Legifrance, etc).
 * Stored client-side under `louis.legalDataKeys` so each user wires
 * their own subscription; the backend looks up the key when a skill
 * needs to fetch from that source. We never ship a default for
 * commercial sources; users provide what they license.
 */
function LegalDataHunterCard() {
    const SOURCES: { id: string; label: string; jurisdiction: string }[] = [
        { id: "westlaw", label: "Westlaw", jurisdiction: "US · UK · Global" },
        { id: "lexis", label: "LexisNexis", jurisdiction: "Global" },
        { id: "courtlistener", label: "CourtListener", jurisdiction: "US (free)" },
        { id: "eurlex", label: "EUR-Lex", jurisdiction: "EU (free)" },
        { id: "casemine", label: "CASEMine", jurisdiction: "India · MENA" },
        { id: "legifrance", label: "Légifrance", jurisdiction: "France (free)" },
        { id: "wipo", label: "WIPO Lex", jurisdiction: "Global IP (free)" },
        { id: "secedgar", label: "SEC EDGAR", jurisdiction: "US filings (free)" },
    ];
    const [keys, setKeys] = useState<Record<string, string>>(() => {
        if (typeof window === "undefined") return {};
        try {
            return JSON.parse(window.localStorage.getItem("louis.legalDataKeys") ?? "{}");
        } catch {
            return {};
        }
    });
    const [reveal, setReveal] = useState<Record<string, boolean>>({});

    function save(id: string, value: string) {
        const next = { ...keys, [id]: value };
        if (!value) delete next[id];
        setKeys(next);
        if (typeof window !== "undefined") {
            window.localStorage.setItem("louis.legalDataKeys", JSON.stringify(next));
        }
    }

    return (
        <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="font-medium text-sm text-gray-900">Legal-data-hunter API keys</div>
                    <div className="text-xs text-gray-500">
                        Wire your own subscription to each research source. Keys stay in your browser; the backend forwards them only when a skill needs to fetch.
                    </div>
                </div>
            </div>
            <div className="mt-4 space-y-2">
                {SOURCES.map((s) => (
                    <div
                        key={s.id}
                        className="grid grid-cols-[1fr_auto] gap-3 items-center"
                    >
                        <div className="text-sm">
                            <div className="font-medium text-gray-800">{s.label}</div>
                            <div className="text-[11px] text-gray-500">{s.jurisdiction}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <input
                                type={reveal[s.id] ? "text" : "password"}
                                value={keys[s.id] ?? ""}
                                onChange={(e) => save(s.id, e.target.value)}
                                placeholder={keys[s.id] ? "" : "API key"}
                                className="text-xs border border-gray-300 rounded px-2 py-1 w-44 focus:outline-none focus:ring-1 focus:ring-amber-300"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setReveal((r) => ({ ...r, [s.id]: !r[s.id] }))
                                }
                                className="text-[10px] text-gray-500 hover:text-gray-800 px-1.5"
                            >
                                {reveal[s.id] ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function IntegrationsTab() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-700">
                Connections to OpenClaw, MS Word, GitHub, MCP servers, legal-research databases, and 25+ other tools have their own dedicated page.
            </p>
            <a href="/integrations" className="block border border-gray-200 rounded-lg p-4 hover:border-gray-900 transition">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-sm">Open Integrations Hub</div>
                        <div className="text-xs text-gray-500">32 integrations · OAuth · API key · MCP URL</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
            </a>
        </div>
    );
}

function NotificationsTab() {
    const NOTIF_DEFAULTS = [
        { id: "deadlines",      label: "Approaching deadlines",        enabled: true,  channel: "email + slack" },
        { id: "matter-comments", label: "Comments on your matters",    enabled: true,  channel: "email" },
        { id: "skills-router",  label: "Skills router decisions",      enabled: false, channel: "in-app" },
        { id: "weekly-digest",  label: "Weekly digest",                enabled: true,  channel: "email" },
        { id: "credit-threshold", label: "Credit threshold",            enabled: true,  channel: "email" },
        { id: "team-activity",  label: "Team activity",                enabled: false, channel: "in-app" },
    ];
    const [state, setState] = useState<Record<string, boolean>>({});
    useEffect(() => {
        try {
            const stored = localStorage.getItem("louis.notif.prefs");
            if (stored) {
                setState(JSON.parse(stored));
                return;
            }
        } catch {}
        const init: Record<string, boolean> = {};
        for (const n of NOTIF_DEFAULTS) init[n.id] = n.enabled;
        setState(init);
    }, []);
    function toggle(id: string) {
        setState(prev => {
            const next = { ...prev, [id]: !prev[id] };
            try { localStorage.setItem("louis.notif.prefs", JSON.stringify(next)); } catch {}
            return next;
        });
    }
    return (
        <div className="space-y-1">
            {NOTIF_DEFAULTS.map(n => (
                <label key={n.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                        type="checkbox"
                        checked={state[n.id] ?? n.enabled}
                        onChange={() => toggle(n.id)}
                        className="accent-gray-900"
                    />
                    <div className="flex-1">
                        <div className="text-sm">{n.label}</div>
                        <div className="text-[10px] text-gray-500">via {n.channel}</div>
                    </div>
                </label>
            ))}
            <p className="text-[11px] text-gray-500 mt-3">Preferences persist in your browser. Server-side delivery routing wires up when notification channels (email + Slack) are configured in Integrations.</p>
        </div>
    );
}

function SecurityTab() {
    return (
        <div className="space-y-4">
            <Card title="Two-factor authentication" value="Not enabled" cta="Enable" />
            <Card title="Active sessions" value="2 devices" cta="View" />
            <Card title="Audit log" value="View all actions on your account" cta="View" />
            <Card title="SSO / SAML" value="Available on Business plan" cta="Learn more" />
            <Card title="Data residency" value="EU (eu-west-1)" sub="Required for GDPR/PDPL" />
        </div>
    );
}

function Card({ title, value, sub, cta, href }: { title: string; value: string; sub?: string; cta?: string; href?: string }) {
    return (
        <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
            <div>
                <div className="text-xs text-gray-500 mb-0.5">{title}</div>
                <div className="font-medium text-sm">{value}</div>
                {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
            </div>
            {cta && (
                <a href={href} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    {cta} <ChevronRight className="w-3 h-3" />
                </a>
            )}
        </div>
    );
}

function Note({ children }: { children: React.ReactNode }) {
    return <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{children}</div>;
}
