"use client";

import { useMemo, useState } from "react";
import { ShieldAlert, AlertOctagon, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/contexts/LocaleContext";
import { getAuthHeader } from "@/app/lib/louisApi";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const SEVERITY_STYLE: Record<string, { bg: string; text: string; icon: typeof AlertOctagon; labelKey: string }> = {
    P0: { bg: "bg-red-100", text: "text-red-700", icon: AlertOctagon, labelKey: "risk.severity.p0" },
    P1: { bg: "bg-amber-100", text: "text-amber-700", icon: AlertTriangle, labelKey: "risk.severity.p1" },
    P2: { bg: "bg-yellow-50", text: "text-yellow-800", icon: AlertCircle, labelKey: "risk.severity.p2" },
    P3: { bg: "bg-muted", text: "text-muted-foreground", icon: Info, labelKey: "risk.severity.p3" },
};

interface Finding {
    ruleId: string;
    severity: "P0" | "P1" | "P2" | "P3";
    category: string;
    title: string;
    description: string;
    remediation: string;
    excerpt?: string;
    alternateClauseId?: string;
    jurisdictionalNotes?: string;
}

interface ScanResult {
    characters: number;
    findings: Finding[];
    countBySeverity: Record<string, number>;
    countByCategory: Record<string, number>;
    riskScore: number;
    summary: string;
}

const SAMPLE = `MASTER SERVICES AGREEMENT

This Master Services Agreement is entered into between Acme Trading LLC ("Customer") and Globex Solutions FZE ("Service Provider").

1. Services. Service Provider agrees to provide consulting services to Customer.

2. Fees. Customer shall pay Service Provider AED 10,000 per month.

3. Term. This Agreement is effective from 1 January 2026 and may be terminated at any time by either party for convenience by giving thirty (30) days written notice.

4. Intellectual Property. Service Provider agrees to assign to Customer all intellectual property created during the engagement.

5. Confidentiality. Each party shall keep the other's information confidential.

6. Data Protection. Service Provider may process personal data of Customer's employees and customers as part of the Services. Service Provider may transfer such personal data to third countries.

7. Liability. Service Provider's liability under this Agreement is unlimited.

8. Governing Law. This Agreement shall be governed by the laws of [JURISDICTION TBD].

IN WITNESS WHEREOF, the parties have executed this Agreement.
`;

export default function RiskScanPage() {
    const { t } = useLocale();
    const [text, setText] = useState(SAMPLE);
    const [jurisdiction, setJurisdiction] = useState<string>("");
    const [result, setResult] = useState<ScanResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function scan() {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const auth = await getAuthHeader();
            const r = await fetch(`${API_BASE}/api/risk/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...auth },
                body: JSON.stringify({ text, jurisdiction: jurisdiction || undefined }),
            });
            if (!r.ok) {
                const j = await r.json();
                throw new Error(j.error || `HTTP ${r.status}`);
            }
            setResult(await r.json());
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }

    const grouped = useMemo(() => {
        if (!result) return {} as Record<string, Finding[]>;
        const g: Record<string, Finding[]> = {};
        for (const f of result.findings) {
            g[f.category] = g[f.category] || [];
            g[f.category].push(f);
        }
        return g;
    }, [result]);

    const scoreColor =
        !result ? "" :
        result.riskScore >= 60 ? "from-red-100 to-red-50 border-red-300 text-red-700" :
        result.riskScore >= 30 ? "from-amber-100 to-amber-50 border-amber-300 text-amber-700" :
        result.riskScore > 0 ? "from-yellow-50 to-emerald-50 border-yellow-200 text-yellow-800" :
        "from-emerald-50 to-emerald-100 border-emerald-300 text-emerald-700";

    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-center gap-3 mb-2">
                <ShieldAlert className="w-6 h-6 text-foreground/80" />
                <h1 className="text-2xl font-semibold">{t("risk.title")}</h1>
            </div>
            <p className="text-sm text-muted-foreground mb-8">
                {t("risk.intro")}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-card border border-border rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("risk.contract_text")}</h2>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="jur" className="text-xs">{t("risk.jurisdiction")}</Label>
                            <select id="jur" value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} className="border border-border rounded text-xs px-2 py-1">
                                <option value="">{t("risk.auto")}</option>
                                <option value="UAE">UAE</option>
                                <option value="KSA">KSA</option>
                                <option value="LB">Lebanon</option>
                                <option value="FR">France</option>
                                <option value="UK">UK</option>
                                <option value="US">US</option>
                            </select>
                        </div>
                    </div>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={24}
                        className="w-full border border-border rounded p-3 text-xs font-mono"
                    />
                    <div className="flex items-center gap-2 mt-3">
                        <Button onClick={scan} disabled={loading || !text.trim()}>
                            {loading ? t("risk.scanning") : t("risk.scan_btn")}
                        </Button>
                        <Button variant="outline" onClick={() => setText("")}>{t("risk.clear")}</Button>
                        <Button variant="ghost" onClick={() => setText(SAMPLE)} className="ml-auto text-xs">{t("risk.load_sample")}</Button>
                    </div>
                </div>

                {/* Scoreboard / summary */}
                <div className="space-y-4">
                    {!result && !error && (
                        <div className="bg-card border border-border rounded-lg p-5">
                            <div className="text-sm text-muted-foreground italic">{t("risk.empty")}</div>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>
                    )}
                    {result && (
                        <>
                            <div className={`bg-gradient-to-br ${scoreColor} border rounded-lg p-5`}>
                                <div className="text-xs uppercase tracking-wide opacity-70">{t("risk.score")}</div>
                                <div className="text-4xl font-semibold mt-1">{result.riskScore} <span className="text-base opacity-50">/100</span></div>
                                <div className="text-sm mt-2 opacity-90">{result.summary}</div>
                            </div>
                            <div className="bg-card border border-border rounded-lg p-5 grid grid-cols-4 gap-3">
                                {(["P0", "P1", "P2", "P3"] as const).map(sev => {
                                    const s = SEVERITY_STYLE[sev];
                                    const Icon = s.icon;
                                    return (
                                        <div key={sev} className={`rounded p-3 ${s.bg}`}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Icon className={`w-4 h-4 ${s.text}`} />
                                                <span className={`text-[10px] uppercase font-semibold ${s.text}`}>{t(s.labelKey)}</span>
                                            </div>
                                            <div className={`text-xl font-semibold ${s.text}`}>{result.countBySeverity[sev]}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            {Object.keys(result.countByCategory).length > 0 && (
                                <div className="bg-card border border-border rounded-lg p-5">
                                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{t("risk.by_category")}</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(result.countByCategory).sort((a,b) => b[1]-a[1]).map(([cat, n]) => (
                                            <span key={cat} className="bg-muted text-foreground/80 text-xs px-2 py-0.5 rounded-full">
                                                {cat} · {n}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {result && result.findings.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("risk.findings", { count: result.findings.length })}</h2>
                    {Object.entries(grouped).map(([cat, fs]) => (
                        <div key={cat}>
                            <h3 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">{cat}</h3>
                            <div className="space-y-2">
                                {fs.map(f => {
                                    const s = SEVERITY_STYLE[f.severity];
                                    const Icon = s.icon;
                                    return (
                                        <div key={f.ruleId} className={`border rounded-lg p-4 ${s.bg} border-opacity-50`}>
                                            <div className="flex items-start gap-2">
                                                <Icon className={`w-4 h-4 mt-0.5 ${s.text}`} />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className={`text-[10px] uppercase font-semibold ${s.text}`}>{f.severity} · {t(s.labelKey)}</span>
                                                        <span className="text-xs text-muted-foreground font-mono">{f.ruleId}</span>
                                                    </div>
                                                    <div className="font-medium text-foreground">{f.title}</div>
                                                    <div className="text-sm text-foreground/80 mt-1">{f.description}</div>
                                                    {f.excerpt && (
                                                        <div className="mt-2 text-xs font-mono bg-card border border-border rounded p-2 italic">
                                                            "…{f.excerpt}…"
                                                        </div>
                                                    )}
                                                    <div className="mt-2 text-sm text-emerald-800 bg-emerald-50/40 border border-emerald-100 rounded p-2">
                                                        <span className="font-semibold">{t("risk.fix")}</span>{f.remediation}
                                                    </div>
                                                    {f.alternateClauseId && (
                                                        <div className="mt-1 text-xs text-blue-700">
                                                            {t("risk.see_clause")} <a href={`/clauses?q=${f.alternateClauseId}`} className="underline font-mono">{f.alternateClauseId}</a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 text-xs text-muted-foreground italic text-center">
                {t("risk.footer")}
            </div>
        </div>
    );
}
