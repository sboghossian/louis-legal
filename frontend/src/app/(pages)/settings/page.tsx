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
import { useLocale } from "@/contexts/LocaleContext";
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

const TAB_DEFS: { id: Tab; key: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "profile",       key: "settings.tab.profile",       icon: User },
    { id: "appearance",    key: "settings.tab.appearance",    icon: Palette },
    { id: "models",        key: "settings.tab.models",        icon: Plug },
    { id: "billing",       key: "settings.tab.billing",       icon: CreditCard },
    { id: "team",          key: "settings.tab.team",          icon: TeamIcon },
    { id: "data",          key: "settings.tab.data",          icon: Database },
    { id: "integrations",  key: "settings.tab.integrations",  icon: Plug },
    { id: "notifications", key: "settings.tab.notifications", icon: Bell },
    { id: "security",      key: "settings.tab.security",      icon: Shield },
];

export default function SettingsPage() {
    const [tab, setTab] = useState<Tab>("profile");
    const { t } = useLocale();
    const activeTabKey = TAB_DEFS.find(td => td.id === tab)?.key ?? "";
    const activeTabLabel = activeTabKey ? t(activeTabKey) : "";

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left nav */}
            <div className="w-[240px] flex-shrink-0 border-r border-border p-4">
                <div className="flex items-center gap-2 mb-4">
                    <SettingsIcon className="w-4 h-4" />
                    <h1 className="font-semibold text-sm">{t("settings.title")}</h1>
                </div>
                <nav className="space-y-1">
                    {TAB_DEFS.map(td => (
                        <button
                            key={td.id}
                            onClick={() => setTab(td.id)}
                            className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 ${tab === td.id ? "bg-muted font-medium" : "text-foreground/80 hover:bg-muted"}`}
                        >
                            <td.icon className="w-3.5 h-3.5" />
                            {t(td.key)}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Right pane */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
                <h2 className="text-lg font-semibold mb-1">{activeTabLabel}</h2>
                <p className="text-xs text-muted-foreground mb-6">{t("settings.subtitle", { tab: activeTabLabel.toLowerCase() })}</p>

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
    const { t } = useLocale();
    const displayName =
        profile?.displayName?.trim() || user?.email?.split("@")[0] || "—";
    const email = user?.email || "—";
    const organisation = profile?.organisation?.trim() || "—";
    return (
        <div className="space-y-4">
            <Card title={t("settings.profile.display_name")} value={displayName} cta={t("action.change")} href="/account" />
            <Card title={t("settings.profile.email")} value={email} sub={user?.email ? t("settings.profile.email_verified") : undefined} />
            <Card title={t("settings.profile.organisation")} value={organisation} cta={t("action.change")} href="/account" />
            <Card title={t("settings.profile.language_pref")} value={t("settings.profile.language_pref.value")} />
            <Note>{t("settings.profile.note")}</Note>
        </div>
    );
}

function ModelsTab() {
    const { t } = useLocale();
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
                {t("settings.models.intro")}
            </p>
            <a href="/settings/api-keys" className="block border border-border rounded-lg p-4 hover:border-foreground transition">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-sm">{t("settings.models.open_keys")}</div>
                        <div className="text-xs text-muted-foreground">{t("settings.models.open_keys.sub")}</div>
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
                    <div className="font-medium text-sm">{t("settings.models.auto.title")}</div>
                    <div className="text-xs text-muted-foreground">
                        {t("settings.models.auto.sub")}
                    </div>
                </div>
            </label>
            <Note>
                {t("settings.models.note")}
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
    const { t } = useLocale();
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
                        <div className="font-medium text-sm">{t("settings.voice.title")}</div>
                        <div className="text-xs text-muted-foreground">
                            {t("settings.voice.subtitle")}
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
                                {t("settings.voice.enable")}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                {t("settings.voice.enable.sub")}
                            </div>
                        </div>
                    </label>

                    {ttsOk && (
                        <div className="space-y-1.5">
                            <div className="text-xs font-medium text-foreground/80">
                                {t("settings.voice.preferred")}
                            </div>
                            <select
                                value={prefs.voiceURI ?? ""}
                                onChange={(e) =>
                                    update("voiceURI", e.target.value || null)
                                }
                                className="w-full text-sm border border-border rounded px-2 py-1.5 bg-card"
                            >
                                {visibleVoices.length === 0 && (
                                    <option value="">{t("settings.voice.system_default")}</option>
                                )}
                                {visibleVoices.map((v) => (
                                    <option key={v.voiceURI} value={v.voiceURI}>
                                        {v.name} ({v.lang})
                                        {v.default ? " · default" : ""}
                                    </option>
                                ))}
                            </select>
                            <div className="text-[10px] text-muted-foreground">
                                {t("settings.voice.locale_note", { locale: localeFamily })}
                            </div>
                        </div>
                    )}

                    {ttsOk && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-medium text-foreground/80">
                                <span>{t("settings.voice.rate")}</span>
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
                                <span>{t("settings.voice.silence")}</span>
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
                                {t("settings.voice.silence.sub")}
                            </div>
                        </div>
                    )}

                    {ttsOk && (
                        <button
                            type="button"
                            onClick={testVoice}
                            className="flex items-center gap-2 h-8 px-3 rounded-md bg-card border border-border hover:border-amber-400 hover:bg-amber-50 text-sm transition-colors"
                        >
                            <Play className="h-3 w-3" /> {t("settings.voice.test")}
                        </button>
                    )}

                    {!sttOk && (
                        <Note>
                            {t("settings.voice.unsupported")}
                        </Note>
                    )}
                </div>
            )}
        </div>
    );
}

function BillingTab() {
    const { t } = useLocale();
    return (
        <div className="space-y-4">
            <Card title={t("settings.billing.plan.title")} value={t("settings.billing.plan.value")} sub={t("settings.billing.plan.sub")} />
            <div className="rounded-lg border border-border bg-muted/30 p-5">
                <div className="font-serif text-base text-foreground mb-1">{t("settings.billing.free.title")}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("settings.billing.free.intro.before")}<a href="/settings/api-keys" className="text-amber-800 underline hover:text-amber-900">{t("settings.billing.free.intro.link")}</a>{t("settings.billing.free.intro.after")}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded border border-border bg-card p-3">
                        <div className="text-foreground font-medium mb-0.5">{t("settings.billing.col.free.title")}</div>
                        <div className="text-muted-foreground">{t("settings.billing.col.free.sub")}</div>
                    </div>
                    <div className="rounded border border-border bg-card p-3">
                        <div className="text-foreground font-medium mb-0.5">{t("settings.billing.col.bill.title")}</div>
                        <div className="text-muted-foreground">{t("settings.billing.col.bill.sub")}</div>
                    </div>
                    <div className="rounded border border-border bg-card p-3">
                        <div className="text-foreground font-medium mb-0.5">{t("settings.billing.col.os.title")}</div>
                        <div className="text-muted-foreground">{t("settings.billing.col.os.sub")}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TeamTab() {
    const { t } = useLocale();
    return (
        <div className="space-y-4">
            <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
                <div className="font-medium text-foreground/80 mb-1">{t("settings.team.empty.title")}</div>
                <div className="mb-4">{t("settings.team.empty.intro")}</div>
                <Button size="sm" variant="outline">{t("settings.team.empty.cta")}</Button>
            </div>
            <Note>{t("settings.team.note")}</Note>
        </div>
    );
}

function DataTab() {
    const { t } = useLocale();
    return (
        <div className="space-y-4">
            <Card title={t("settings.data.storage")} value={t("settings.data.storage.value")} sub={t("settings.data.storage.sub")} />
            <Card title={t("settings.data.region")} value={t("settings.data.region.value")} />
            <Card title={t("settings.data.retention")} value={t("settings.data.retention.value")} cta={t("action.configure")} />
            <LegalDataHunterCard />
            <Card title={t("settings.data.export.title")} value={t("settings.data.export.sub")} cta={t("action.export")} />
            <Card title={t("settings.data.delete.title")} value={t("settings.data.delete.sub")} cta={t("action.delete")} href="/account" />
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
    const { t } = useLocale();
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
                    <div className="font-medium text-sm text-foreground">{t("settings.data.legal.title")}</div>
                    <div className="text-xs text-muted-foreground">
                        {t("settings.data.legal.sub")}
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
                                placeholder={keys[s.id] ? "" : t("settings.data.legal.placeholder")}
                                className="text-xs border border-border rounded px-2 py-1 w-44 focus:outline-none focus:ring-1 focus:ring-amber-300"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setReveal((r) => ({ ...r, [s.id]: !r[s.id] }))
                                }
                                className="text-[10px] text-muted-foreground hover:text-foreground px-1.5"
                            >
                                {reveal[s.id] ? t("settings.data.legal.hide") : t("settings.data.legal.show")}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function IntegrationsTab() {
    const { t } = useLocale();
    return (
        <div className="space-y-4">
            <p className="text-sm text-foreground/80">
                {t("settings.integrations.intro")}
            </p>
            <a href="/integrations" className="block border border-border rounded-lg p-4 hover:border-foreground transition">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-sm">{t("settings.integrations.cta")}</div>
                        <div className="text-xs text-muted-foreground">{t("settings.integrations.cta.sub")}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
            </a>
        </div>
    );
}

function NotificationsTab() {
    const { t } = useLocale();
    const NOTIF_DEFAULTS = [
        { id: "deadlines",       label: t("settings.notif.deadlines"),      enabled: true,  channel: "email + slack" },
        { id: "matter-comments", label: t("settings.notif.matters"),         enabled: true,  channel: "email" },
        { id: "skills-router",   label: t("settings.notif.skills_router"),   enabled: false, channel: "in-app" },
        { id: "weekly-digest",   label: t("settings.notif.weekly"),          enabled: true,  channel: "email" },
        { id: "credit-threshold",label: t("settings.notif.credit"),          enabled: true,  channel: "email" },
        { id: "team-activity",   label: t("settings.notif.team"),            enabled: false, channel: "in-app" },
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
                        <div className="text-[10px] text-muted-foreground">{t("settings.notif.via", { channel: n.channel })}</div>
                    </div>
                </label>
            ))}
            <p className="text-[11px] text-muted-foreground mt-3">{t("settings.notifications.persist")}</p>
        </div>
    );
}

function SecurityTab() {
    const { t } = useLocale();
    return (
        <div className="space-y-4">
            <Card title={t("settings.security.2fa")} value={t("settings.security.2fa.value")} cta={t("settings.security.2fa.cta")} />
            <Card title={t("settings.security.sessions")} value={t("settings.security.sessions.value")} cta={t("action.view")} />
            <Card title={t("settings.security.audit")} value={t("settings.security.audit.value")} cta={t("action.view")} />
            <Card title={t("settings.security.sso")} value={t("settings.security.sso.value")} cta={t("settings.security.sso.cta")} />
            <Card title={t("settings.security.residency")} value={t("settings.security.residency.value")} sub={t("settings.security.residency.sub")} />
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
