"use client";

import { useEffect, useState } from "react";
import { Key, ExternalLink, X, Eye, Check, Trash2, Star } from "lucide-react";
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
                <Key className="w-5 h-5 text-gray-700" />
                <h1 className="text-lg font-semibold">API Keys</h1>
                <Badge variant="secondary">{keys.length} configured</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-6">
                Bring your own API keys for chat, drafting, research. Louis uses your default key per provider. Your tokens, your provider bill.
            </p>

            {loading && <div className="text-sm text-gray-500">Loading…</div>}

            {/* Configured keys */}
            {keys.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Your keys</h2>
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {keys.map(k => {
                            const provider = providers.find(p => p.code === k.provider);
                            return (
                                <div key={k.id} className="px-4 py-3 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{provider?.name || k.provider}</span>
                                            {k.isDefault && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">default</Badge>}
                                            {k.label && <span className="text-xs text-gray-500">· {k.label}</span>}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono mt-0.5">{k.keyMasked}</div>
                                    </div>
                                    {!k.isDefault && (
                                        <button onClick={() => setDefault(k.id)} className="text-[10px] text-blue-600 hover:underline" title="Make default">
                                            <Star className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button onClick={() => remove(k.id, k.label || k.provider)} className="text-gray-400 hover:text-red-600" title="Delete">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Add a key — provider catalog */}
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Available providers</h2>
            <div className="grid grid-cols-2 gap-3">
                {providers.map(p => {
                    const userKeys = keys.filter(k => k.provider === p.code);
                    return (
                        <div key={p.code} className="border border-gray-200 rounded-lg p-4 flex flex-col">
                            <div className="flex items-start gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-medium text-sm">{p.name}</span>
                                        {userKeys.length > 0 && <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">{userKeys.length} key{userKeys.length === 1 ? "" : "s"}</Badge>}
                                        {p.hasKey && userKeys.length === 0 && <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px]">env default</Badge>}
                                    </div>
                                    <div className="text-xs text-gray-500 line-clamp-2">{p.description}</div>
                                </div>
                            </div>
                            <div className="mt-auto flex items-center justify-between pt-2">
                                <a href={p.signupUrl} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:underline inline-flex items-center gap-1">
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

            <div className="mt-8 text-xs text-gray-500">
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
            <div className="bg-white rounded-lg w-full max-w-md">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Add {provider.name} key</h2>
                        <div className="text-xs text-gray-500 mt-0.5">{provider.description}</div>
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
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                    <p className="text-[10px] text-gray-500">
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
