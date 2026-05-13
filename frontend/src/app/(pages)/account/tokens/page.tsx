"use client";

/**
 * Developer-tokens management.
 *
 * The backend's public API (/api/v1/*) is authenticated with
 * `pk_louis_<random>` tokens, minted from a Supabase session at
 * POST /api/v1/tokens and stored hashed. This page lets users mint,
 * list, and revoke their own keys without curling the API.
 *
 * Plaintext secrets are returned exactly once at mint time — we surface
 * them in a copy-to-clipboard banner, then forget about them.
 */

import { useEffect, useState } from "react";
import { Copy, Check, Trash2, Plus, KeyRound, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/app/contexts/ConfirmDialog";
import { getAuthHeader } from "@/app/lib/louisApi";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

interface ApiToken {
    id: string;
    label: string | null;
    prefix: string | null;
    created_at: string;
    last_used_at: string | null;
    expires_at: string | null;
}

interface Envelope<T> {
    data: T | null;
    error: { code: string; message: string } | null;
    meta?: Record<string, unknown>;
}

function relative(iso: string | null): string {
    if (!iso) return "never";
    try {
        const t = new Date(iso).getTime();
        const diff = Date.now() - t;
        if (diff < 60_000) return "just now";
        if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
        if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
        return `${Math.round(diff / 86_400_000)}d ago`;
    } catch {
        return "—";
    }
}

export default function DeveloperTokensPage() {
    const confirm = useConfirm();
    const [tokens, setTokens] = useState<ApiToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newLabel, setNewLabel] = useState("");
    const [minting, setMinting] = useState(false);
    // The plaintext secret is shown exactly once after minting, then we
    // wipe it from state.
    const [justMinted, setJustMinted] = useState<{ id: string; token: string } | null>(null);
    const [copied, setCopied] = useState(false);

    async function refresh() {
        setLoading(true);
        setError(null);
        try {
            const auth = await getAuthHeader();
            if (!auth.Authorization) {
                throw new Error("Sign in to manage developer tokens.");
            }
            const r = await fetch(`${API_BASE}/api/v1/tokens`, {
                headers: auth,
                cache: "no-store",
            });
            const json = (await r.json()) as Envelope<{ tokens?: ApiToken[] }>;
            if (!r.ok || json.error) {
                throw new Error(json.error?.message ?? `HTTP ${r.status}`);
            }
            setTokens(json.data?.tokens ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void refresh();
    }, []);

    async function mint() {
        setMinting(true);
        setError(null);
        try {
            const auth = await getAuthHeader();
            const r = await fetch(`${API_BASE}/api/v1/tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...auth },
                body: JSON.stringify({
                    label: newLabel.trim() || "untitled key",
                }),
            });
            const json = (await r.json()) as Envelope<{
                id: string;
                token: string;
            }>;
            if (!r.ok || json.error || !json.data?.token) {
                throw new Error(json.error?.message ?? `HTTP ${r.status}`);
            }
            setJustMinted({ id: json.data.id, token: json.data.token });
            setNewLabel("");
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setMinting(false);
        }
    }

    async function revoke(t: ApiToken) {
        const ok = await confirm({
            title: "Revoke this token?",
            message: `"${t.label ?? t.prefix}" will stop working immediately. Tools using this key will need a new one.`,
            destructive: true,
            confirmLabel: "Revoke",
        });
        if (!ok) return;
        try {
            const auth = await getAuthHeader();
            await fetch(`${API_BASE}/api/v1/tokens/${t.id}`, {
                method: "DELETE",
                headers: auth,
            });
            if (justMinted?.id === t.id) setJustMinted(null);
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }

    function copyToken() {
        if (!justMinted?.token) return;
        navigator.clipboard.writeText(justMinted.token).then(
            () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            },
            () => {
                /* clipboard denied — leave UI as-is */
            },
        );
    }

    return (
        <div className="space-y-8">
            <header>
                <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="w-5 h-5 text-foreground/80" />
                    <h2 className="text-2xl font-medium font-serif">
                        Developer tokens
                    </h2>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                    Authenticate with the public API at <code>/api/v1/*</code>.
                    Tokens start with <code>pk_louis_</code> and are stored
                    hashed — Louis cannot recover a lost token, you revoke
                    and mint a new one.
                </p>
            </header>

            {justMinted && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-amber-900">
                                Copy this token now — it will not be shown again.
                            </div>
                            <div className="text-xs text-amber-800 mt-0.5">
                                Store it in your secret manager. Anyone who has
                                it can call the public API as you.
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-card border border-amber-200 rounded p-2">
                        <code className="flex-1 min-w-0 truncate font-mono text-xs">
                            {justMinted.token}
                        </code>
                        <Button size="sm" variant="outline" onClick={copyToken}>
                            {copied ? (
                                <>
                                    <Check className="w-3.5 h-3.5 mr-1" /> Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                                </>
                            )}
                        </Button>
                    </div>
                    <button
                        onClick={() => setJustMinted(null)}
                        className="text-[11px] text-amber-800 hover:underline"
                    >
                        I&apos;ve saved it — dismiss
                    </button>
                </div>
            )}

            <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Mint a new token</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 min-w-0">
                        <Label className="text-xs">Label</Label>
                        <Input
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="e.g. ci-bot · firm-portal · local-dev"
                            className="mt-1"
                            maxLength={80}
                        />
                    </div>
                    <div className="sm:self-end">
                        <Button
                            onClick={mint}
                            disabled={minting}
                            className="w-full sm:w-auto"
                        >
                            {minting ? (
                                "Minting…"
                            ) : (
                                <>
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Mint token
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold">Your tokens</h3>
                    <Badge variant="secondary">{tokens.length}</Badge>
                </div>
                {error && (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3">
                        {error}
                    </div>
                )}
                {loading && tokens.length === 0 && (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                )}
                {!loading && tokens.length === 0 && !error && (
                    <div className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
                        No tokens yet. Mint one above to start using the public API.
                    </div>
                )}
                {tokens.length > 0 && (
                    <div className="border border-border rounded-lg divide-y divide-border">
                        {tokens.map((t) => (
                            <div
                                key={t.id}
                                className="px-4 py-3 flex flex-wrap items-center gap-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {t.label || "untitled key"}
                                        </span>
                                        {t.prefix && (
                                            <code className="text-[11px] font-mono text-muted-foreground">
                                                {t.prefix}…
                                            </code>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                        Created {relative(t.created_at)} · Last used {relative(t.last_used_at)}
                                        {t.expires_at && (
                                            <>
                                                {" "}· Expires{" "}
                                                {new Date(t.expires_at).toLocaleDateString()}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => revoke(t)}
                                    className="text-muted-foreground hover:text-red-600"
                                    title="Revoke"
                                    aria-label={`Revoke ${t.label ?? "token"}`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
