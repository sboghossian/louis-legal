"use client";

import { useEffect, useState } from "react";
import { CreditCard, ExternalLink, AlertCircle, Check, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface Plan {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
    interval: string;
    description: string;
    features: string[];
    monthlyCredits: number;
    teamSeats: number;
}

interface Subscription {
    id: string;
    planId: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    stripeCustomerId?: string;
}

interface CreditEntry {
    id: string;
    delta: number;
    reason: string;
    createdAt: string;
}

interface Invoice {
    id: string;
    amountDueCents: number;
    currency: string;
    status: string;
    periodStart: string;
    periodEnd: string;
}

function dollars(cents: number): string {
    if (cents === -1) return "Custom";
    return `$${(cents / 100).toFixed(0)}`;
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function BillingPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [sub, setSub] = useState<Subscription | null>(null);
    const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
    const [balance, setBalance] = useState(0);
    const [history, setHistory] = useState<CreditEntry[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [stripeLive, setStripeLive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState<string | null>(null);

    async function refresh() {
        setLoading(true);
        try {
            const [pr, sr, cr, ir] = await Promise.all([
                fetch(`${API_BASE}/api/billing/plans`),
                fetch(`${API_BASE}/api/billing/subscription`, { headers: { "x-user-id": "demo" } }),
                fetch(`${API_BASE}/api/billing/credits`, { headers: { "x-user-id": "demo" } }),
                fetch(`${API_BASE}/api/billing/invoices`, { headers: { "x-user-id": "demo" } }),
            ]);
            const p = await pr.json();
            const s = await sr.json();
            const c = await cr.json();
            const inv = await ir.json();
            setPlans(p.plans ?? []);
            setSub(s.subscription);
            setCurrentPlan(s.plan);
            setBalance(c.balance ?? 0);
            setHistory(c.history ?? []);
            setInvoices(inv.invoices ?? []);
            setStripeLive(!!s.stripeLive);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, []);

    async function changePlan(planId: string) {
        setWorking(planId);
        try {
            await fetch(`${API_BASE}/api/billing/change-plan`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": "demo" },
                body: JSON.stringify({ planId }),
            });
            await refresh();
        } finally {
            setWorking(null);
        }
    }

    async function cancel() {
        if (!confirm("Cancel your subscription? You'll keep access until the end of the current period.")) return;
        await fetch(`${API_BASE}/api/billing/cancel`, { method: "POST", headers: { "x-user-id": "demo" } });
        refresh();
    }

    async function reactivate() {
        await fetch(`${API_BASE}/api/billing/reactivate`, { method: "POST", headers: { "x-user-id": "demo" } });
        refresh();
    }

    async function openPortal() {
        const r = await fetch(`${API_BASE}/api/billing/portal`, { method: "POST", headers: { "x-user-id": "demo" } });
        const j = await r.json();
        if (j.live) {
            window.location.href = j.url;
        } else {
            alert("Stripe is not configured yet. Add STRIPE_API_KEY to the backend or connect Stripe in /integrations.");
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-5 h-5 text-gray-700" />
                <h1 className="text-2xl font-serif">Billing</h1>
                {!stripeLive && <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">demo mode · Stripe not configured</Badge>}
                <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={refresh}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                </Button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
                Manage your plan, credit balance, and invoices.
                {!stripeLive && " Plan changes simulate in dev mode — connect Stripe via /integrations to make them billable."}
            </p>

            {loading && <div className="text-sm text-gray-500">Loading…</div>}

            {/* Current plan + credits */}
            {sub && currentPlan && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-emerald-50 border border-emerald-200 rounded-lg p-5 col-span-2">
                        <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Current plan</div>
                        <div className="text-2xl font-semibold text-gray-900 mb-1">{currentPlan.name}</div>
                        <div className="text-sm text-gray-600 mb-3">{currentPlan.description}</div>
                        <div className="flex flex-wrap gap-2">
                            {sub.cancelAtPeriodEnd ? (
                                <Button size="sm" variant="outline" onClick={reactivate}>Reactivate</Button>
                            ) : (
                                currentPlan.id !== "free" && (
                                    <Button size="sm" variant="ghost" className="text-red-600" onClick={cancel}>Cancel at period end</Button>
                                )
                            )}
                            <Button size="sm" variant="outline" onClick={openPortal}>
                                Stripe portal <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                        </div>
                        {sub.cancelAtPeriodEnd && (
                            <div className="mt-3 text-xs text-amber-700 bg-white/60 border border-amber-200 rounded p-2 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Will downgrade to Free on {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                            </div>
                        )}
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                        <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Credit balance</div>
                        <div className="text-2xl font-semibold text-gray-900">{balance.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-1">Next reset {new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>
                    </div>
                </div>
            )}

            {/* Plans grid */}
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
                {plans.map(p => {
                    const isCurrent = sub?.planId === p.id;
                    return (
                        <div
                            key={p.id}
                            className={`border rounded-lg p-4 flex flex-col ${isCurrent ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white"}`}
                        >
                            <div className="font-medium text-sm">{p.name}</div>
                            <div className="text-2xl font-semibold mt-1">{dollars(p.priceCents)}</div>
                            <div className={`text-[10px] mt-0.5 ${isCurrent ? "text-gray-300" : "text-gray-500"}`}>
                                {p.priceCents === -1 ? "contact sales" : `per ${p.interval}`}
                            </div>
                            <div className={`text-xs mt-2 ${isCurrent ? "text-gray-200" : "text-gray-600"}`}>{p.description}</div>
                            <ul className="mt-3 space-y-1 text-[11px]">
                                {p.features.slice(0, 5).map((f, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                        <Check className={`w-3 h-3 mt-0.5 ${isCurrent ? "text-emerald-400" : "text-emerald-600"} flex-shrink-0`} />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-auto pt-3">
                                {isCurrent ? (
                                    <Badge variant="secondary" className="bg-white/20 text-white text-[10px] w-full justify-center">current</Badge>
                                ) : p.id === "enterprise" ? (
                                    <Button size="sm" variant="outline" className="w-full h-7 text-xs">Contact sales</Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="w-full h-7 text-xs"
                                        onClick={() => changePlan(p.id)}
                                        disabled={working === p.id}
                                    >
                                        {working === p.id ? "Switching…" : "Switch to"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Credit history + invoices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Credit activity</h2>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
                        {history.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">No credit activity yet.</div>
                        )}
                        {history.map(e => (
                            <div key={e.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                                <span className={`font-mono w-16 text-right ${e.delta > 0 ? "text-emerald-700" : "text-gray-700"}`}>
                                    {e.delta > 0 ? "+" : ""}{e.delta.toLocaleString()}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="truncate">{e.reason}</div>
                                    <div className="text-[10px] text-gray-500">{formatTime(e.createdAt)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Invoices</h2>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-96 overflow-y-auto">
                        {invoices.length === 0 && (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">No invoices yet.</div>
                        )}
                        {invoices.map(inv => (
                            <div key={inv.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium">{dollars(inv.amountDueCents)}</div>
                                    <div className="text-[10px] text-gray-500">
                                        {new Date(inv.periodStart).toLocaleDateString()} → {new Date(inv.periodEnd).toLocaleDateString()}
                                    </div>
                                </div>
                                <Badge variant="secondary" className={inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                                    {inv.status}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-10 text-xs text-gray-500">
                <p>
                    🔒 Bring your own keys at <a href="/settings/api-keys" className="underline">Settings → API Keys</a> to use Louis at provider cost (no markup).
                    Hosted plans bundle Claude + Gemini + GPT-4 access with included credits.
                </p>
            </div>
        </div>
    );
}
