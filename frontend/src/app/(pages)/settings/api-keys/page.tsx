"use client";

import { useEffect, useMemo, useState } from "react";
import { Key, ExternalLink, X, Eye, Check, Trash2, Star, Coins, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface Provider {
    code: string;
    name: string;
    description: string;
    signupUrl: string;
    hasKey: boolean;
}

interface ApiKey {
    id: string;
    provider: string;
    label?: string;
    keyMasked: string;
    keyLast4: string;
    isDefault: boolean;
    createdAt: string;
    lastUsedAt?: string;
}

export default function ApiKeysPage() {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState<Provider | null>(null);

    async function refresh() {
        setLoading(true);
        try {
            const [pr, kr] = await Promise.all([
                fetch(`${API_BASE}/api/api-keys/providers`, { headers: { "x-user-id": "demo" } }),
                fetch(`${API_BASE}/api/api-keys`, { headers: { "x-user-id": "demo" } }),
            ]);
            const pj = await pr.json();
            const kj = await kr.json();
            setProviders(pj.providers ?? []);
            setKeys(kj.keys ?? []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, []);

    async function setDefault(id: string) {
        await fetch(`${API_BASE}/api/api-keys/${id}/default`, {
            method: "POST",
            headers: { "x-user-id": "demo" },
        });
        refresh();
    }

    async function remove(id: string, label: string) {
        if (!confirm(`Delete key "${label}"?`)) return;
        await fetch(`${API_BASE}/api/api-keys/${id}`, {
            method: "DELETE",
            headers: { "x-user-id": "demo" },
        });
        refresh();
    }

    return (
        <div className="max-w-4xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Key className="w-5 h-5 text-foreground/80" />
                <h1 className="text-lg font-semibold">API Keys</h1>
                <Badge variant="secondary">{keys.length} configured</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
                Bring your own API keys for chat, drafting, research. Louis uses your default key per provider. Your tokens, your provider bill.
            </p>

            <TokenSpendWidget />

            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

            {/* Configured keys */}
            {keys.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Your keys</h2>
                    <div className="border border-border rounded-lg divide-y divide-border">
                        {keys.map(k => {
                            const provider = providers.find(p => p.code === k.provider);
                            return (
                                <div key={k.id} className="px-4 py-3 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{provider?.name || k.provider}</span>
                                            {k.isDefault && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">default</Badge>}
                                            {k.label && <span className="text-xs text-muted-foreground">· {k.label}</span>}
                                        </div>
                                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{k.keyMasked}</div>
                                    </div>
                                    {!k.isDefault && (
                                        <button onClick={() => setDefault(k.id)} className="text-[10px] text-blue-600 hover:underline" title="Make default">
                                            <Star className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button onClick={() => remove(k.id, k.label || k.provider)} className="text-muted-foreground hover:text-red-600" title="Delete">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Add a key — provider catalog */}
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Available providers</h2>
            <div className="grid grid-cols-2 gap-3">
                {providers.map(p => {
                    const userKeys = keys.filter(k => k.provider === p.code);
                    return (
                        <div key={p.code} className="border border-border rounded-lg p-4 flex flex-col">
                            <div className="flex items-start gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-medium text-sm">{p.name}</span>
                                        {userKeys.length > 0 && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">{userKeys.length} key{userKeys.length === 1 ? "" : "s"}</Badge>}
                                        {p.hasKey && userKeys.length === 0 && <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]">env default</Badge>}
                                    </div>
                                    <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>
                                </div>
                            </div>
                            <div className="mt-auto flex items-center justify-between pt-2">
                                <a href={p.signupUrl} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:underline inline-flex items-center gap-1">
                                    Get key <ExternalLink className="w-3 h-3" />
                                </a>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAdding(p)}>
                                    + Add key
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {adding && (
                <AddKeyModal provider={adding} onClose={() => setAdding(null)} onAdded={() => { setAdding(null); refresh(); }} />
            )}

            <div className="mt-8 text-xs text-muted-foreground">
                <p>
                    🔒 Keys are stored encrypted at rest with your tenant&apos;s isolated key.
                    Louis never sends keys to model providers other than the direct API call;
                    plaintext is held in-memory only for the duration of each request.
                </p>
            </div>
        </div>
    );
}

function AddKeyModal({ provider, onClose, onAdded }: { provider: Provider; onClose: () => void; onAdded: () => void }) {
    const [key, setKey] = useState("");
    const [label, setLabel] = useState("");
    const [makeDefault, setMakeDefault] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [show, setShow] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        if (!key.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const r = await fetch(`${API_BASE}/api/api-keys`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": "demo" },
                body: JSON.stringify({ provider: provider.code, key: key.trim(), label, isDefault: makeDefault }),
            });
            if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
            onAdded();
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg w-full max-w-md">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Add {provider.name} key</h2>
                        <div className="text-xs text-muted-foreground mt-0.5">{provider.description}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="px-6 py-4 space-y-3">
                    <div>
                        <Label className="text-xs">API key</Label>
                        <div className="relative mt-1">
                            <Input
                                type={show ? "text" : "password"}
                                value={key}
                                onChange={e => setKey(e.target.value)}
                                placeholder="sk-… / ak-… / your provider key"
                                className="font-mono pr-10"
                            />
                            <button
                                onClick={() => setShow(s => !s)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Label (optional)</Label>
                        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g., personal · firm · client-X" className="mt-1" />
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={makeDefault} onChange={e => setMakeDefault(e.target.checked)} />
                        Use as default for {provider.name}
                    </label>
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-2 text-xs">{error}</div>}
                    <p className="text-[10px] text-muted-foreground">
                        Need a key? <a href={provider.signupUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Sign up at {provider.name}</a>.
                    </p>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting || !key.trim()}>
                        {submitting ? "Adding…" : <><Check className="w-3.5 h-3.5 mr-1" /> Save key</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// TokenSpendWidget
// ---------------------------------------------------------------------------

/**
 * Local-only spend tracker. The streaming chat layer pushes
 * `{turnAt, model, inputTokens, outputTokens, costUsd}` rows into
 * localStorage under `louis.tokenUsage` (capped at 500 entries). This
 * widget reads + aggregates that array — last 24h, 7d, 30d — and
 * shows estimated cost based on each provider's published per-million
 * token prices.
 *
 * Why local-only: the user pays their provider directly, so we have
 * no authoritative cost number on our side. Tracking client-side is
 * good-enough transparency and never leaves the browser.
 */
interface TokenRow {
    turnAt: number;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
}

function readUsage(): TokenRow[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem("louis.tokenUsage");
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function TokenSpendWidget() {
    const [rows, setRows] = useState<TokenRow[]>(() => readUsage());
    const [alertThreshold, setAlertThreshold] = useState<number>(() => {
        if (typeof window === "undefined") return 0;
        const raw = window.localStorage.getItem("louis.spendAlertUsd");
        return raw ? Number(raw) || 0 : 0;
    });

    useEffect(() => {
        // Re-read on focus so a chat in another tab updates the panel.
        const onFocus = () => setRows(readUsage());
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, []);

    const buckets = useMemo(() => {
        const now = Date.now();
        const d = (h: number) => h * 60 * 60 * 1000;
        const sums = { day: 0, week: 0, month: 0, turns: 0 };
        for (const r of rows) {
            const cost = Number(r.costUsd) || 0;
            const age = now - r.turnAt;
            if (age <= d(24)) sums.day += cost;
            if (age <= d(24 * 7)) sums.week += cost;
            if (age <= d(24 * 30)) {
                sums.month += cost;
                sums.turns += 1;
            }
        }
        return sums;
    }, [rows]);

    function saveThreshold(v: number) {
        setAlertThreshold(v);
        if (typeof window !== "undefined") {
            window.localStorage.setItem("louis.spendAlertUsd", String(v || 0));
        }
    }

    const overTurn = useMemo(() => {
        if (!alertThreshold) return null;
        return rows.find(
            (r) => (r.costUsd ?? 0) > alertThreshold && Date.now() - r.turnAt < 24 * 3600 * 1000,
        );
    }, [rows, alertThreshold]);

    return (
        <div className="mb-8 rounded-xl border border-[#e7e2d6] bg-[#fbf8f2] p-5">
            <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-amber-700" />
                <h2 className="text-sm font-semibold text-foreground">Your token spend (local)</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
                Tracked from your browser only. The authoritative bill is what
                your AI provider invoices you — open your provider dashboard
                for the source of truth.
            </p>
            <div className="grid grid-cols-3 gap-3">
                <SpendCell label="Last 24h" usd={buckets.day} />
                <SpendCell label="Last 7d" usd={buckets.week} />
                <SpendCell label="Last 30d" usd={buckets.month} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                    {buckets.turns} turn{buckets.turns === 1 ? "" : "s"} in the last 30 days
                </span>
                <label className="inline-flex items-center gap-2">
                    Alert above
                    <input
                        type="number"
                        min={0}
                        step={0.05}
                        value={alertThreshold || ""}
                        onChange={(e) => saveThreshold(Number(e.target.value))}
                        placeholder="0.25"
                        className="w-20 px-2 py-1 border border-border rounded text-xs"
                    />
                    <span>USD / turn</span>
                </label>
            </div>
            {overTurn && (
                <div className="mt-3 flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-900">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                        A turn on <strong>{overTurn.model}</strong> cost ${(overTurn.costUsd ?? 0).toFixed(3)} in the last 24h — above your threshold of ${alertThreshold.toFixed(2)}.
                    </span>
                </div>
            )}
        </div>
    );
}

function SpendCell({ label, usd }: { label: string; usd: number }) {
    return (
        <div className="rounded-lg border border-[#e7e2d6] bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                {label}
            </div>
            <div className="font-serif text-xl text-foreground">
                {usd === 0 ? "$0.00" : `$${usd.toFixed(2)}`}
            </div>
        </div>
    );
}
