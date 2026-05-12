"use client";

import { useEffect, useState } from "react";
import {
    Settings as SettingsIcon, User, CreditCard, Users as TeamIcon,
    Database, Plug, Bell, Shield, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Settings hub. Tabs: Profile · Models & API Keys · Billing · Team · Data ·
// Integrations · Notifications · Security. Cross-links to dedicated pages
// (/account, /customize, /skills) where deeper config lives.

type Tab = "profile" | "models" | "billing" | "team" | "data" | "integrations" | "notifications" | "security";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "profile",       label: "Profile",         icon: User },
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
            <p className="text-sm text-gray-600">Pick the AI provider used for chat. You can override per-model in customize.</p>
            <Card title="Default model" value="Anthropic — Claude" cta="Change" href="/account/models" />
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {[
                    { provider: "Anthropic",  key: "Claude Opus / Sonnet / Haiku", state: "configured" as const },
                    { provider: "OpenAI",      key: "GPT-4o / GPT-4.1",            state: "missing" as const },
                    { provider: "Google",      key: "Gemini 2.5 Flash / Pro",      state: "env-default" as const },
                ].map(p => (
                    <div key={p.provider} className="px-4 py-3 flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm">{p.provider}</div>
                            <div className="text-xs text-gray-500">{p.key}</div>
                        </div>
                        {p.state === "configured" && <Badge variant="secondary" className="bg-green-100 text-green-700">configured</Badge>}
                        {p.state === "env-default" && <Badge variant="secondary" className="bg-blue-100 text-blue-700">env default</Badge>}
                        {p.state === "missing" && <Button size="sm" variant="outline" className="h-7 text-xs">Add key</Button>}
                    </div>
                ))}
            </div>
            <Note>Manage keys at <code>/account/models</code>. The skills router uses Gemini Flash by default for intent classification (configurable via env <code>SKILLS_CLASSIFIER_MODEL</code>).</Note>
        </div>
    );
}

function BillingTab() {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <Card title="Plan" value="Pro" sub="$49/mo" />
                <Card title="Credits used" value="4,213 / 50,000" />
                <Card title="Next billing" value="Jun 12, 2026" />
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">Plans</h3>
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { name: "Free",      price: "$0",      desc: "Limited credits"   },
                        { name: "Starter",   price: "$9/mo",   desc: "10k credits"        },
                        { name: "Pro",       price: "$49/mo",  desc: "50k credits",  current: true },
                        { name: "Business",  price: "$199/mo", desc: "eFirm features"     },
                    ].map(p => (
                        <div key={p.name} className={`border rounded p-3 ${p.current ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-lg font-semibold mt-1">{p.price}</div>
                            <div className="text-[10px] text-gray-500 mt-1">{p.desc}</div>
                            {p.current && <Badge variant="secondary" className="bg-blue-100 text-blue-700 mt-2 text-[10px]">current</Badge>}
                        </div>
                    ))}
                </div>
            </div>
            <Note>Stripe customer portal launches in a new window when configured (see Integrations).</Note>
        </div>
    );
}

function TeamTab() {
    return (
        <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {[
                    { name: "Lazar",   role: "Partner / Admin", email: "lazar@haqq.ai" },
                    { name: "Rawad",   role: "Senior Associate", email: "rawad@haqq.ai" },
                    { name: "Riva",    role: "Associate",        email: "riva@haqq.ai" },
                    { name: "Antoine", role: "Paralegal",        email: "antoine@haqq.ai" },
                ].map(m => (
                    <div key={m.email} className="px-4 py-3 flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm">{m.name}</div>
                            <div className="text-xs text-gray-500">{m.email} · {m.role}</div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-xs">Manage</Button>
                    </div>
                ))}
            </div>
            <Button size="sm" variant="outline">Invite team member</Button>
        </div>
    );
}

function DataTab() {
    return (
        <div className="space-y-4">
            <Card title="Document storage" value="Cloudflare R2 — bucket: louis" sub="See docs/STORAGE_SETUP.md" />
            <Card title="Database region" value="Supabase · eu-west-1" />
            <Card title="Data retention" value="Indefinite (per matter)" cta="Configure" />
            <Card title="Export my data" value="Download a JSON archive of your chats, projects, settings" cta="Export" />
            <Card title="Delete account" value="Permanently delete account + all data" cta="Delete" href="/account" />
        </div>
    );
}

function IntegrationsTab() {
    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">Connect Louis with the tools your firm uses.</p>
            <div className="grid grid-cols-2 gap-3">
                {[
                    { name: "Linear",     desc: "Issue tracking — auto-create bugs from chat",  state: "available" },
                    { name: "HubSpot",    desc: "CRM context for matters and clients",          state: "available" },
                    { name: "Stripe",     desc: "Billing + subscription management",            state: "needs-setup" },
                    { name: "Gmail",      desc: "Draft client emails from matter context",      state: "available" },
                    { name: "Notion",     desc: "Internal KB + matter notes",                    state: "available" },
                    { name: "Tawqi3i",    desc: "Lebanese e-signature bridge",                   state: "coming-soon" },
                    { name: "DocuSign",   desc: "E-signature workflow",                          state: "coming-soon" },
                    { name: "PostHog",    desc: "Usage analytics + skill telemetry",             state: "configured" },
                ].map(i => (
                    <div key={i.name} className="border border-gray-200 rounded p-3 flex items-center justify-between">
                        <div>
                            <div className="font-medium text-sm">{i.name}</div>
                            <div className="text-[10px] text-gray-500 line-clamp-1">{i.desc}</div>
                        </div>
                        {i.state === "configured" && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">on</Badge>}
                        {i.state === "available" && <Button size="sm" variant="outline" className="h-6 text-[10px]">Connect</Button>}
                        {i.state === "needs-setup" && <Button size="sm" variant="outline" className="h-6 text-[10px]">Set up</Button>}
                        {i.state === "coming-soon" && <Badge variant="secondary" className="text-[10px]">soon</Badge>}
                    </div>
                ))}
            </div>
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
