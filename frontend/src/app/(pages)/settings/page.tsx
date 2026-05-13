"use client";

import { useEffect, useState } from "react";
import {
    Settings as SettingsIcon, User, CreditCard, Users as TeamIcon,
    Database, Plug, Bell, Shield, ChevronRight, Palette,
    AudioLines, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppearanceTab } from "./AppearanceTab";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import {
    DEFAULT_VOICE_PREFS,
    isSpeechRecognitionSupported,
    isSpeechSynthesisSupported,
    readVoicePrefs,
    writeVoicePrefs,
    type VoicePrefs,
} from "@/app/lib/voice/types";
import { loadVoices, pickDefaultVoice, speak } from "@/app/lib/voice/tts";

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
            <div className="w-[240px] flex-shrink-0 border-r border-border p-4">
                <div className="flex items-center gap-2 mb-4">
                    <SettingsIcon className="w-4 h-4" />
                    <h1 className="font-semibold text-sm">Settings</h1>
                </div>
                <nav className="space-y-1">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 ${tab === t.id ? "bg-muted font-medium" : "text-foreground/80 hover:bg-muted"}`}
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
                <p className="text-xs text-muted-foreground mb-6">Configure {tab}.</p>

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
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const displayName =
        profile?.displayName?.trim() || user?.email?.split("@")[0] || "—";
    const email = user?.email || "—";
    const organisation = profile?.organisation?.trim() || "—";
    return (
        <div className="space-y-4">
            <Card title="Display name" value={displayName} cta="Change" href="/account" />
            <Card title="Email" value={email} sub={user?.email ? "Verified" : undefined} />
            <Card title="Organisation" value={organisation} cta="Change" href="/account" />
            <Card title="Language preference" value="Set in Appearance" />
            <Note>Profile + identity management is in <a href="/account" className="underline">/account</a>.</Note>
        </div>
    );
}

function ModelsTab() {
    const [autoRouteModel, setAutoRouteModel] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        const stored = window.localStorage.getItem("louis.autoRouteModel");
        return stored === null ? true : stored === "1";
    });
    function toggleAutoRoute() {
        setAutoRouteModel((prev) => {
            const next = !prev;
            if (typeof window !== "undefined") {
                window.localStorage.setItem("louis.autoRouteModel", next ? "1" : "0");
            }
            return next;
        });
    }
    return (
        <div className="space-y-4">
            <p className="text-sm text-foreground/80">
                API keys + provider management has its own dedicated page with live state, masked keys, and per-provider defaults.
            </p>
            <a href="/settings/api-keys" className="block border border-border rounded-lg p-4 hover:border-foreground transition">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-sm">Open API Keys</div>
                        <div className="text-xs text-muted-foreground">Add Claude · OpenAI · Gemini · Voyage · 9 more providers</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
            </a>
            <label className="flex items-start gap-3 border border-border rounded-lg p-4 cursor-pointer hover:border-foreground transition">
                <input
                    type="checkbox"
                    checked={autoRouteModel}
                    onChange={toggleAutoRoute}
                    className="accent-foreground mt-0.5"
                />
                <div className="flex-1">
                    <div className="font-medium text-sm">Auto-route model & playbook</div>
                    <div className="text-xs text-muted-foreground">
                        Let Louis pick the cheapest capable model and the matching practice-area playbook for each message. Your composer pick always wins when set.
                    </div>
                </div>
            </label>
            <Note>
                The skill router defaults to Gemini Flash for intent classification (cheap + fast).
                Override via env <code>SKILLS_CLASSIFIER_MODEL</code>.
            </Note>
            <VoiceSection />
        </div>
    );
}

/**
 * Voice mode preferences — fold-out card on the Models tab. Stores
 * everything under `louis.voicePrefs` so the composer (single-shot Mic
 * + overlay), the SpeakMessage TTS button, and this panel all see the
 * same defaults. Hidden when neither STT nor TTS is supported.
 */
function VoiceSection() {
    const [open, setOpen] = useState(false);
    const [prefs, setPrefs] = useState<VoicePrefs>(DEFAULT_VOICE_PREFS);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [sttOk, setSttOk] = useState(false);
    const [ttsOk, setTtsOk] = useState(false);

    useEffect(() => {
        setPrefs(readVoicePrefs());
        setSttOk(isSpeechRecognitionSupported());
        setTtsOk(isSpeechSynthesisSupported());
        if (isSpeechSynthesisSupported()) {
            loadVoices().then((vs) => {
                setVoices(vs);
                // Seed default voice URI if user has none picked yet.
                setPrefs((cur) => {
                    if (cur.voiceURI) return cur;
                    const pick = pickDefaultVoice(vs);
                    if (!pick) return cur;
                    const next = { ...cur, voiceURI: pick.voiceURI };
                    writeVoicePrefs(next);
                    return next;
                });
            });
        }
    }, []);

    function update<K extends keyof VoicePrefs>(key: K, value: VoicePrefs[K]) {
        setPrefs((cur) => {
            const next = { ...cur, [key]: value };
            writeVoicePrefs(next);
            return next;
        });
    }

    function testVoice() {
        speak(
            "This is Louis. Voice mode is ready. Speak naturally and I will reply aloud.",
            { rateOverride: prefs.rate, pitchOverride: prefs.pitch },
        );
    }

    if (!sttOk && !ttsOk) return null;

    const locale =
        typeof navigator !== "undefined" ? navigator.language : "en-US";
    const localeFamily = locale.split("-")[0];
    const visibleVoices = voices.filter(
        (v) => v.lang.startsWith(localeFamily) || v.lang === locale,
    );

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted transition"
            >
                <div className="flex items-center gap-3">
                    <AudioLines className="w-4 h-4 text-amber-700" />
                    <div>
                        <div className="font-medium text-sm">Voice</div>
                        <div className="text-xs text-muted-foreground">
                            Continuous dictation, spoken replies, speak-to-cite
                            commands
                        </div>
                    </div>
                </div>
                <ChevronRight
                    className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
                />
            </button>
            {open && (
                <div className="border-t border-border p-4 space-y-4 bg-muted/50">
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={prefs.enabled}
                            onChange={(e) => update("enabled", e.target.checked)}
                            className="accent-foreground"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-medium">
                                Enable voice features
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                Master switch. Hides the voice-mode button and
                                speaker icons when off.
                            </div>
                        </div>
                    </label>

                    {ttsOk && (
                        <div className="space-y-1.5">
                            <div className="text-xs font-medium text-foreground/80">
                                Preferred voice
                            </div>
                            <select
                                value={prefs.voiceURI ?? ""}
                                onChange={(e) =>
                                    update("voiceURI", e.target.value || null)
                                }
                                className="w-full text-sm border border-border rounded px-2 py-1.5 bg-card"
                            >
                                {visibleVoices.length === 0 && (
                                    <option value="">System default</option>
                                )}
                                {visibleVoices.map((v) => (
                                    <option key={v.voiceURI} value={v.voiceURI}>
                                        {v.name} ({v.lang})
                                        {v.default ? " · default" : ""}
                                    </option>
                                ))}
                            </select>
                            <div className="text-[10px] text-muted-foreground">
                                Showing voices for {localeFamily}. System voices
                                vary by OS + browser.
                            </div>
                        </div>
                    )}

                    {ttsOk && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-medium text-foreground/80">
                                <span>Speech rate</span>
                                <span className="text-muted-foreground font-normal tabular-nums">
                                    {prefs.rate.toFixed(2)}×
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0.5}
                                max={2.0}
                                step={0.05}
                                value={prefs.rate}
                                onChange={(e) =>
                                    update("rate", parseFloat(e.target.value))
                                }
                                className="w-full accent-amber-700"
                            />
                        </div>
                    )}

                    {sttOk && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-medium text-foreground/80">
                                <span>Auto-submit silence threshold</span>
                                <span className="text-muted-foreground font-normal tabular-nums">
                                    {(prefs.silenceMs / 1000).toFixed(1)}s
                                </span>
                            </div>
                            <input
                                type="range"
                                min={1000}
                                max={3000}
                                step={100}
                                value={prefs.silenceMs}
                                onChange={(e) =>
                                    update("silenceMs", parseInt(e.target.value, 10))
                                }
                                className="w-full accent-amber-700"
                            />
                            <div className="text-[10px] text-muted-foreground">
                                How long Louis waits after you stop speaking
                                before sending the transcript.
                            </div>
                        </div>
                    )}

                    {ttsOk && (
                        <button
                            type="button"
                            onClick={testVoice}
                            className="flex items-center gap-2 h-8 px-3 rounded-md bg-card border border-border hover:border-amber-400 hover:bg-amber-50 text-sm transition-colors"
                        >
                            <Play className="h-3 w-3" /> Test voice
                        </button>
                    )}

                    {!sttOk && (
                        <Note>
                            Speech recognition isn&apos;t supported in this
                            browser. Use Chrome, Edge, or Arc for voice-mode
                            dictation. Text-to-speech still works.
                        </Note>
                    )}
                </div>
            )}
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
            <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">Plans</h3>
                <div className="grid grid-cols-4 gap-3">
                    {PLANS.map(p => (
                        <div key={p.name} className="border border-border rounded p-3">
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-lg font-semibold mt-1">{p.price}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">{p.desc}</div>
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
            <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                <div className="font-medium text-foreground/80 mb-1">No team yet</div>
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
        <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <div className="font-medium text-sm text-foreground">Legal-data-hunter API keys</div>
                    <div className="text-xs text-muted-foreground">
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
                            <div className="font-medium text-foreground">{s.label}</div>
                            <div className="text-[11px] text-muted-foreground">{s.jurisdiction}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <input
                                type={reveal[s.id] ? "text" : "password"}
                                value={keys[s.id] ?? ""}
                                onChange={(e) => save(s.id, e.target.value)}
                                placeholder={keys[s.id] ? "" : "API key"}
                                className="text-xs border border-border rounded px-2 py-1 w-44 focus:outline-none focus:ring-1 focus:ring-amber-300"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setReveal((r) => ({ ...r, [s.id]: !r[s.id] }))
                                }
                                className="text-[10px] text-muted-foreground hover:text-foreground px-1.5"
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
            <p className="text-sm text-foreground/80">
                Connections to OpenClaw, MS Word, GitHub, MCP servers, legal-research databases, and 25+ other tools have their own dedicated page.
            </p>
            <a href="/integrations" className="block border border-border rounded-lg p-4 hover:border-foreground transition">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-sm">Open Integrations Hub</div>
                        <div className="text-xs text-muted-foreground">32 integrations · OAuth · API key · MCP URL</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
                <label key={n.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded cursor-pointer">
                    <input
                        type="checkbox"
                        checked={state[n.id] ?? n.enabled}
                        onChange={() => toggle(n.id)}
                        className="accent-foreground"
                    />
                    <div className="flex-1">
                        <div className="text-sm">{n.label}</div>
                        <div className="text-[10px] text-muted-foreground">via {n.channel}</div>
                    </div>
                </label>
            ))}
            <p className="text-[11px] text-muted-foreground mt-3">Preferences persist in your browser. Server-side delivery routing wires up when notification channels (email + Slack) are configured in Integrations.</p>
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
        <div className="border border-border rounded-lg p-4 flex items-center justify-between">
            <div>
                <div className="text-xs text-muted-foreground mb-0.5">{title}</div>
                <div className="font-medium text-sm">{value}</div>
                {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
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
