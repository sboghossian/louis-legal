"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LouisMark } from "@/components/brand/louis-mark";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

async function authHeaders(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const STEPS = ["welcome", "source", "role", "jurisdictions", "practice", "use-cases", "language", "done"] as const;
type Step = typeof STEPS[number];

const SOURCES = [
    "Twitter / X",
    "LinkedIn",
    "Google search",
    "ChatGPT / Claude recommendation",
    "Word of mouth — friend / colleague",
    "Conference / event",
    "Bar association",
    "University / law school",
    "Podcast",
    "Other",
];

const ROLES = [
    "Partner",
    "Senior Associate",
    "Associate",
    "Paralegal / Trainee",
    "In-house Counsel / GC",
    "Solo practitioner",
    "Law student",
    "Legal Operations / KM",
    "Compliance / Risk",
    "Founder / Business owner",
    "Investor",
    "Journalist / researcher",
    "Other",
];

const JURISDICTIONS = [
    "UAE — Onshore",
    "UAE — DIFC",
    "UAE — ADGM",
    "Saudi Arabia",
    "Lebanon",
    "Egypt",
    "Bahrain",
    "Qatar",
    "Kuwait",
    "Oman",
    "Jordan",
    "United Kingdom",
    "France",
    "European Union",
    "United States",
    "Singapore",
    "Hong Kong",
];

const PRACTICE_AREAS = [
    "Corporate / M&A",
    "Banking & Finance",
    "Capital Markets",
    "Real Estate",
    "Employment & Labor",
    "Family & Personal Status",
    "Litigation & Disputes",
    "Arbitration",
    "Intellectual Property",
    "Tax",
    "Regulatory & Compliance",
    "Data Protection & Privacy",
    "Construction",
    "Technology & FinTech",
    "Healthcare",
    "Energy & Resources",
    "White-Collar / Investigations",
    "Restructuring & Insolvency",
];

const USE_CASES = [
    "Draft contracts faster",
    "Review counterparty redlines",
    "Multi-jurisdiction research",
    "Translate Arabic ↔ English ↔ French",
    "Cite-check before filing",
    "Run risk scans on incoming docs",
    "Compare two contract versions",
    "Calculate EOS / stamp duty / deadlines",
    "Manage matters + conflict checks",
    "Train junior team members",
    "Bar exam prep",
    "Stay current with MENA regulation",
];

const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "ar", name: "العربية (Arabic)" },
    { code: "fr", name: "Français (French)" },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("welcome");
    const [source, setSource] = useState<string>("");
    const [role, setRole] = useState<string>("");
    const [organization, setOrganization] = useState<string>("");
    const [jurisdictions, setJurisdictions] = useState<string[]>([]);
    const [practiceAreas, setPracticeAreas] = useState<string[]>([]);
    const [useCases, setUseCases] = useState<string[]>([]);
    const [language, setLanguage] = useState<string>("en");
    const [submitting, setSubmitting] = useState(false);

    const { user } = useAuth();

    // Check if already onboarded; if so, redirect to home
    useEffect(() => {
        (async () => {
            try {
                const headers = await authHeaders();
                if (!headers.Authorization) return; // not signed in
                const r = await fetch(`${API_BASE}/api/onboarding/me`, {
                    headers,
                });
                if (!r.ok) return;
                const j = await r.json();
                if (j.complete) {
                    if (user?.id && typeof window !== "undefined") {
                        localStorage.setItem(
                            `louis.onboarded:${user.id}`,
                            "true",
                        );
                    }
                    router.replace("/home");
                }
            } catch { /* not signed in or backend offline — proceed */ }
        })();
    }, [router, user?.id]);

    const stepIdx = STEPS.indexOf(step);
    const progress = Math.round((stepIdx / (STEPS.length - 1)) * 100);

    function next() {
        const idx = STEPS.indexOf(step);
        if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
    }
    function back() {
        const idx = STEPS.indexOf(step);
        if (idx > 0) setStep(STEPS[idx - 1]);
    }

    function toggleMulti(value: string, setter: (vs: string[]) => void, list: string[]) {
        if (list.includes(value)) setter(list.filter(x => x !== value));
        else setter([...list, value]);
    }

    async function complete() {
        setSubmitting(true);
        try {
            const headers = await authHeaders();
            await fetch(`${API_BASE}/api/onboarding/me/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    referralSource: source,
                    role,
                    organization,
                    jurisdictions,
                    practiceAreas,
                    useCases,
                    preferredLanguage: language,
                }),
            });
            if (user?.id && typeof window !== "undefined") {
                localStorage.setItem(`louis.onboarded:${user.id}`, "true");
            }
            router.replace("/home");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-[color:var(--louis-cream)] flex items-center justify-center p-6">
            <div className="bg-card rounded-2xl shadow-xl w-full max-w-2xl border border-[color:var(--louis-rule)]">
                {/* Progress bar */}
                <div className="px-8 pt-6">
                    <div className="flex items-center gap-2 mb-2">
                        <LouisMark size={26} />
                        <span className="font-serif text-lg">Louis</span>
                        <span className="text-xs text-muted-foreground ml-auto">Step {stepIdx + 1} of {STEPS.length}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-foreground h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                <div className="px-8 py-8 min-h-[400px]">
                    {step === "welcome" && (
                        <div className="text-center">
                            <h1 className="text-3xl font-semibold mb-2">Welcome to Louis.</h1>
                            <p className="text-muted-foreground mb-6">
                                The MENA-first legal AI infrastructure — comfort-first UX, 983 vetted skills, jurisdiction-aware drafting,
                                and a transparent skill router. Built on the open-source Mike fork, extended for HAQQ.
                            </p>
                            <p className="text-sm text-muted-foreground mb-8">
                                We&apos;ll ask 6 quick questions to tailor Louis to your work. Takes under 2 minutes.
                            </p>
                            <Button size="lg" onClick={next}>
                                Let&apos;s go <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}

                    {step === "source" && (
                        <Step title="Where did you hear about Louis?" subtitle="Helps us figure out what's working.">
                            <div className="grid grid-cols-2 gap-2">
                                {SOURCES.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSource(s)}
                                        className={`text-left px-4 py-3 border rounded-lg text-sm transition ${source === s ? "border-foreground bg-foreground text-white" : "border-border hover:border-border"}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </Step>
                    )}

                    {step === "role" && (
                        <Step title="What's your role?" subtitle="We'll tune skill router + tone for your level.">
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {ROLES.map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setRole(r)}
                                        className={`text-left px-4 py-3 border rounded-lg text-sm transition ${role === r ? "border-foreground bg-foreground text-white" : "border-border hover:border-border"}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                            <div>
                                <Label className="text-xs">Organization (optional)</Label>
                                <Input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="HAQQ Inc, your firm, etc." className="mt-1" />
                            </div>
                        </Step>
                    )}

                    {step === "jurisdictions" && (
                        <Step title="Which jurisdictions do you work in?" subtitle="Pick any number — we'll prioritize content for these.">
                            <div className="grid grid-cols-3 gap-2">
                                {JURISDICTIONS.map(j => {
                                    const active = jurisdictions.includes(j);
                                    return (
                                        <button
                                            key={j}
                                            onClick={() => toggleMulti(j, setJurisdictions, jurisdictions)}
                                            className={`text-left px-3 py-2 border rounded-lg text-xs transition ${active ? "border-foreground bg-foreground text-white" : "border-border hover:border-border"}`}
                                        >
                                            {active && <Check className="w-3 h-3 inline mr-1" />}
                                            {j}
                                        </button>
                                    );
                                })}
                            </div>
                        </Step>
                    )}

                    {step === "practice" && (
                        <Step title="What practice areas?" subtitle="Pick all that apply — surfaces relevant clauses + flows.">
                            <div className="grid grid-cols-3 gap-2">
                                {PRACTICE_AREAS.map(p => {
                                    const active = practiceAreas.includes(p);
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => toggleMulti(p, setPracticeAreas, practiceAreas)}
                                            className={`text-left px-3 py-2 border rounded-lg text-xs transition ${active ? "border-foreground bg-foreground text-white" : "border-border hover:border-border"}`}
                                        >
                                            {active && <Check className="w-3 h-3 inline mr-1" />}
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                        </Step>
                    )}

                    {step === "use-cases" && (
                        <Step title="What do you want to use Louis for?" subtitle="We'll feature these on your Home screen.">
                            <div className="grid grid-cols-2 gap-2">
                                {USE_CASES.map(u => {
                                    const active = useCases.includes(u);
                                    return (
                                        <button
                                            key={u}
                                            onClick={() => toggleMulti(u, setUseCases, useCases)}
                                            className={`text-left px-3 py-2 border rounded-lg text-sm transition ${active ? "border-foreground bg-foreground text-white" : "border-border hover:border-border"}`}
                                        >
                                            {active && <Check className="w-3 h-3 inline mr-1" />}
                                            {u}
                                        </button>
                                    );
                                })}
                            </div>
                        </Step>
                    )}

                    {step === "language" && (
                        <Step title="Preferred language?" subtitle="You can switch any time. Bilingual contracts always rendered in both.">
                            <div className="grid grid-cols-3 gap-3">
                                {LANGUAGES.map(l => (
                                    <button
                                        key={l.code}
                                        onClick={() => setLanguage(l.code)}
                                        className={`px-4 py-6 border rounded-lg text-center transition ${language === l.code ? "border-foreground bg-foreground text-white" : "border-border hover:border-border"}`}
                                    >
                                        <div className="font-semibold mb-1">{l.name}</div>
                                        <div className="text-xs opacity-70">{l.code.toUpperCase()}</div>
                                    </button>
                                ))}
                            </div>
                        </Step>
                    )}

                    {step === "done" && (
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
                                <Check className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h1 className="text-2xl font-semibold mb-2">You&apos;re all set.</h1>
                            <p className="text-muted-foreground mb-2">
                                Louis is configured for {role || "you"}{jurisdictions.length > 0 ? `, working across ${jurisdictions.length} jurisdiction${jurisdictions.length === 1 ? "" : "s"}` : ""}.
                            </p>
                            <p className="text-muted-foreground text-sm mb-8">
                                Tip: connect an API key in Settings → API Keys to use your own Claude / OpenAI / Gemini account.
                                <br/>Tip: check the Skills library to see what Louis can do.
                            </p>
                            <Button size="lg" onClick={complete} disabled={submitting}>
                                {submitting ? "Saving…" : "Enter Louis"}
                                <Sparkles className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Nav */}
                {step !== "welcome" && step !== "done" && (
                    <div className="px-8 py-4 border-t flex items-center justify-between">
                        <Button variant="ghost" onClick={back}>
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </Button>
                        <button onClick={() => setStep("done")} className="text-xs text-muted-foreground hover:underline">
                            Skip for now
                        </button>
                        <Button onClick={next}>
                            Next <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div>
            <h2 className="text-xl font-semibold mb-1">{title}</h2>
            <p className="text-sm text-muted-foreground mb-5">{subtitle}</p>
            {children}
        </div>
    );
}
