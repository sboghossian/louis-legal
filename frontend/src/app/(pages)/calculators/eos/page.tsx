"use client";

import { useState } from "react";
import { Calculator, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const JURISDICTIONS = [
    { code: "UAE", name: "🇦🇪 UAE", currency: "AED" },
    { code: "KSA", name: "🇸🇦 Saudi Arabia", currency: "SAR" },
    { code: "BH", name: "🇧🇭 Bahrain", currency: "BHD" },
    { code: "QA", name: "🇶🇦 Qatar", currency: "QAR" },
    { code: "OM", name: "🇴🇲 Oman", currency: "OMR" },
    { code: "KW", name: "🇰🇼 Kuwait", currency: "KWD" },
] as const;

interface EosResult {
    jurisdiction: string;
    serviceYears: number;
    basicSalaryMonthly: number;
    gratuity: number;
    currency: string;
    breakdown: { label: string; amount: number; note?: string }[];
    caveats: string[];
    citations: string[];
}

export default function EosCalculatorPage() {
    const [jurisdiction, setJurisdiction] = useState<typeof JURISDICTIONS[number]["code"]>("UAE");
    const [salary, setSalary] = useState("15000");
    const [years, setYears] = useState("5");
    const [months, setMonths] = useState("0");
    const [days, setDays] = useState("0");
    const [resignation, setResignation] = useState(false);
    const [dismissedForCause, setDismissedForCause] = useState(false);
    const [result, setResult] = useState<EosResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const selectedJur = JURISDICTIONS.find(j => j.code === jurisdiction)!;

    async function calculate() {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const totalDays = (parseFloat(years) || 0) * 365 + (parseFloat(months) || 0) * 30 + (parseFloat(days) || 0);
            const r = await fetch(`${API_BASE}/api/calculators/eos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    jurisdiction,
                    basicSalaryMonthly: parseFloat(salary),
                    serviceDays: totalDays,
                    endedByResignation: resignation,
                    dismissedForCause,
                }),
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

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="flex items-center gap-3 mb-2">
                <Calculator className="w-6 h-6 text-gray-700" />
                <h1 className="text-2xl font-semibold">End-of-Service Calculator</h1>
            </div>
            <p className="text-sm text-gray-600 mb-8">
                Statutory gratuity / indemnité de fin de service for GCC employment terminations.
                Always verify against latest law and the specific employment contract.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Inputs</h2>

                    <div>
                        <Label htmlFor="jurisdiction" className="text-xs">Jurisdiction</Label>
                        <select
                            id="jurisdiction"
                            value={jurisdiction}
                            onChange={e => setJurisdiction(e.target.value as typeof jurisdiction)}
                            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                            {JURISDICTIONS.map(j => (
                                <option key={j.code} value={j.code}>{j.name} ({j.currency})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <Label htmlFor="salary" className="text-xs">
                            Basic salary per month ({selectedJur.currency})
                            <span className="text-gray-400 ml-2">basic only — exclude housing/allowances for UAE/QA/OM</span>
                        </Label>
                        <Input
                            id="salary"
                            type="number"
                            value={salary}
                            onChange={e => setSalary(e.target.value)}
                            className="mt-1"
                            placeholder="15000"
                        />
                    </div>

                    <div>
                        <Label className="text-xs">Service duration</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                            <div>
                                <Input type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="years" />
                                <div className="text-[10px] text-gray-500 mt-0.5 ml-1">years</div>
                            </div>
                            <div>
                                <Input type="number" value={months} onChange={e => setMonths(e.target.value)} placeholder="months" />
                                <div className="text-[10px] text-gray-500 mt-0.5 ml-1">months</div>
                            </div>
                            <div>
                                <Input type="number" value={days} onChange={e => setDays(e.target.value)} placeholder="days" />
                                <div className="text-[10px] text-gray-500 mt-0.5 ml-1">days</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={resignation}
                                onChange={e => setResignation(e.target.checked)}
                                className="rounded"
                            />
                            <span>Termination by employee resignation</span>
                            <span className="text-xs text-gray-400">(affects KSA)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={dismissedForCause}
                                onChange={e => setDismissedForCause(e.target.checked)}
                                className="rounded"
                            />
                            <span>Dismissed for cause</span>
                            <span className="text-xs text-gray-400">(UAE Art. 44 / KSA Art. 80)</span>
                        </label>
                    </div>

                    <Button onClick={calculate} disabled={loading} className="w-full mt-4">
                        {loading ? "Calculating…" : "Calculate Gratuity"}
                    </Button>
                </div>

                {/* Result */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">Result</h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
                            {error}
                        </div>
                    )}

                    {!result && !error && (
                        <div className="text-sm text-gray-500 italic py-12 text-center">
                            Enter details and click Calculate
                        </div>
                    )}

                    {result && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border border-emerald-200 rounded-lg p-5">
                                <div className="text-xs text-gray-600 uppercase tracking-wide">Estimated Gratuity</div>
                                <div className="text-3xl font-semibold text-gray-900 mt-1">
                                    {result.gratuity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    <span className="text-base text-gray-600 ml-2">{result.currency}</span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                    {result.serviceYears.toFixed(2)} years of service at {result.basicSalaryMonthly} {result.currency}/month basic
                                </div>
                            </div>

                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Breakdown</div>
                                <div className="space-y-1">
                                    {result.breakdown.map((b, i) => (
                                        <div key={i} className="flex items-start justify-between text-sm py-2 border-b border-gray-100 last:border-b-0">
                                            <div className="flex-1">
                                                <div>{b.label}</div>
                                                {b.note && <div className="text-xs text-gray-500 mt-0.5">{b.note}</div>}
                                            </div>
                                            <div className={`font-mono ml-4 ${b.amount < 0 ? "text-red-600" : ""}`}>
                                                {b.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {result.caveats.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Caveats
                                    </div>
                                    <ul className="text-xs text-gray-700 bg-amber-50/40 border border-amber-200 rounded p-3 space-y-1 list-disc list-inside">
                                        {result.caveats.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                                    <Info className="w-3.5 h-3.5" />
                                    Citations
                                </div>
                                <ul className="text-xs text-gray-600 space-y-0.5">
                                    {result.citations.map((c, i) => <li key={i}>{c}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 text-xs text-gray-500 italic text-center">
                Louis provides legal information, not legal advice. Always verify against the latest statutes and the specific employment contract.
            </div>
        </div>
    );
}
