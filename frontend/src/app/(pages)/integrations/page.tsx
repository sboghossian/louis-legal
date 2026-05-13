"use client";

import { useEffect, useMemo, useState } from "react";
import { Plug, Search, ExternalLink, Check, X, Power, Building2, Briefcase, MessageSquare, DollarSign, Brain, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getAuthHeader as authHeaders } from "@/app/lib/louisApi";
import { useConfirm } from "@/app/contexts/ConfirmDialog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type Status = "connected" | "disconnected" | "needs-reauth" | "coming-soon";
type Category = "legal-tool" | "productivity" | "communication" | "billing" | "ai-mcp" | "developer" | "research";
type AuthType = "oauth" | "api-key" | "url" | "none";

interface Integration {
    id: string;
    name: string;
    description: string;
    category: Category;
    authType: AuthType;
    signupUrl?: string;
    status: Status;
    connectedAt?: string;
    lastUsedAt?: string;
    config: Record<string, unknown>;
}

const CATEGORY_META: Record<Category, { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }> = {
    "legal-tool":   { label: "Legal Tools",      icon: Building2,    accent: "bg-blue-50 text-blue-700" },
    research:       { label: "Research",         icon: Brain,         accent: "bg-emerald-50 text-emerald-700" },
    productivity:   { label: "Productivity",     icon: Briefcase,     accent: "bg-purple-50 text-purple-700" },
    communication:  { label: "Communication",    icon: MessageSquare, accent: "bg-amber-50 text-amber-700" },
    billing:        { label: "Billing & CRM",    icon: DollarSign,    accent: "bg-rose-50 text-rose-700" },
    "ai-mcp":       { label: "AI / MCP",          icon: Brain,         accent: "bg-indigo-50 text-indigo-700" },
    developer:      { label: "Developer",        icon: Code,          accent: "bg-muted text-foreground/80" },
};

const STATUS_STYLE: Record<Status, string> = {
    connected: "bg-green-100 text-green-700",
    disconnected: "bg-muted text-muted-foreground",
    "needs-reauth": "bg-amber-100 text-amber-700",
    "coming-soon": "bg-muted text-muted-foreground",
};

export default function IntegrationsPage() {
    const confirm = useConfirm();
    const [all, setAll] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [activeCategory, setActiveCategory] = useState<Category | null>(null);
    const [showOnlyConnected, setShowOnlyConnected] = useState(false);
    const [connecting, setConnecting] = useState<Integration | null>(null);

    async function refresh() {
        setLoading(true);
        try {
            const headers = await authHeaders();
            const r = await fetch(`${API_BASE}/api/integrations/catalog`, { headers });
            const j = await r.json();
            setAll(j.catalog ?? []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return all.filter(i => {
            if (activeCategory && i.category !== activeCategory) return false;
            if (showOnlyConnected && i.status !== "connected") return false;
            if (needle && !(i.name + " " + i.description + " " + i.category).toLowerCase().includes(needle)) return false;
            return true;
        });
    }, [all, q, activeCategory, showOnlyConnected]);

    const connectedCount = all.filter(i => i.status === "connected").length;
    const grouped = useMemo(() => {
        const g: Record<Category, Integration[]> = {} as Record<Category, Integration[]>;
        for (const i of filtered) {
            (g[i.category] ||= []).push(i);
        }
        return g;
    }, [filtered]);

    async function quickConnect(integration: Integration) {
        if (integration.authType === "none") {
            const headers = await authHeaders();
            await fetch(`${API_BASE}/api/integrations/${integration.id}/connect`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ config: {} }),
            });
            refresh();
        } else {
            setConnecting(integration);
        }
    }

    async function disconnect(integration: Integration) {
        const ok = await confirm({
            title: `Disconnect ${integration.name}?`,
            message: "Louis will stop using this integration until you reconnect.",
            confirmLabel: "Disconnect",
            destructive: true,
        });
        if (!ok) return;
        const headers = await authHeaders();
        await fetch(`${API_BASE}/api/integrations/${integration.id}/disconnect`, {
            method: "POST",
            headers,
        });
        refresh();
    }

    return (
        <div className="max-w-6xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Plug className="w-5 h-5 text-foreground/80" />
                <h1 className="text-lg font-semibold">Integrations</h1>
                <Badge variant="secondary">{connectedCount} connected · {all.length} available</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
                Connect Louis with the tools your firm uses. OpenClaw, MS Word, GitHub, MCP servers, legal data sources, billing, communication, and more.
            </p>

            {/* Toolbar */}
            <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search integrations…" className="pl-9" />
                </div>
                <label className="flex items-center gap-2 px-3 border border-border rounded-lg text-sm cursor-pointer">
                    <input type="checkbox" checked={showOnlyConnected} onChange={e => setShowOnlyConnected(e.target.checked)} />
                    Only connected
                </label>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-6">
                <Chip active={activeCategory === null} onClick={() => setActiveCategory(null)}>All</Chip>
                {Object.entries(CATEGORY_META).map(([id, meta]) => (
                    <Chip key={id} active={activeCategory === id} onClick={() => setActiveCategory(activeCategory === id ? null : id as Category)}>
                        {meta.label}
                    </Chip>
                ))}
            </div>

            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

            {Object.entries(grouped).map(([cat, items]) => {
                const meta = CATEGORY_META[cat as Category];
                const Icon = meta.icon;
                return (
                    <section key={cat} className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${meta.accent}`}>
                                <Icon className="w-3.5 h-3.5" /> {meta.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{items.length}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {items.map(i => (
                                <IntegrationCard
                                    key={i.id}
                                    integration={i}
                                    onConnect={() => quickConnect(i)}
                                    onDisconnect={() => disconnect(i)}
                                    onOpenConfig={() => setConnecting(i)}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}

            {connecting && (
                <ConnectModal
                    integration={connecting}
                    onClose={() => setConnecting(null)}
                    onConnected={() => { setConnecting(null); refresh(); }}
                />
            )}

            <div className="mt-8 text-xs text-muted-foreground border-t border-border pt-6">
                <p>
                    🔌 <strong>Building a custom integration?</strong> Use MCP (Model Context Protocol) — point Louis at any MCP server URL
                    and tools become available immediately. <a href="/docs" className="text-blue-600 underline">Docs → Integrations</a>.
                </p>
            </div>
        </div>
    );
}

function IntegrationCard({
    integration: i,
    onConnect,
    onDisconnect,
    onOpenConfig,
}: {
    integration: Integration;
    onConnect: () => void;
    onDisconnect: () => void;
    onOpenConfig: () => void;
}) {
    const connected = i.status === "connected";
    return (
        <div className={`border rounded-lg p-4 flex flex-col ${connected ? "border-green-300 bg-green-50/30" : "border-border bg-card"}`}>
            <div className="flex items-start gap-2 mb-1">
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{i.name}</div>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLE[i.status]} mt-0.5`}>{i.status}</span>
                </div>
                {i.signupUrl && (
                    <a href={i.signupUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-muted-foreground" title="Provider site">
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                )}
            </div>
            <div className="text-xs text-muted-foreground mb-3 line-clamp-3 min-h-[3em]">{i.description}</div>
            <div className="mt-auto flex items-center gap-2">
                {i.status === "coming-soon" ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1" disabled>
                        Coming soon
                    </Button>
                ) : connected ? (
                    <>
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={onOpenConfig}>
                            Configure
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={onDisconnect} title="Disconnect">
                            <Power className="w-3.5 h-3.5" />
                        </Button>
                    </>
                ) : (
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={onConnect}>
                        Connect
                    </Button>
                )}
            </div>
        </div>
    );
}

function ConnectModal({ integration, onClose, onConnected }: { integration: Integration; onClose: () => void; onConnected: () => void }) {
    const [apiKey, setApiKey] = useState("");
    const [serverUrl, setServerUrl] = useState("");
    const [workspaceId, setWorkspaceId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function submit() {
        setSubmitting(true);
        try {
            const config: Record<string, unknown> = {};
            if (integration.authType === "api-key") config.apiKey = apiKey;
            if (integration.authType === "url") config.serverUrl = serverUrl;
            if (workspaceId) config.workspaceId = workspaceId;
            const headers = await authHeaders();
            await fetch(`${API_BASE}/api/integrations/${integration.id}/connect`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ config }),
            });
            onConnected();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg w-full max-w-md">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Connect {integration.name}</h2>
                        <div className="text-xs text-muted-foreground mt-0.5">{integration.description}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="px-6 py-4 space-y-3">
                    {integration.authType === "oauth" && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                            <p className="font-medium mb-1">OAuth flow</p>
                            <p className="text-xs text-blue-800">
                                In production this opens a popup to {integration.name}. For this preview, click Connect to simulate a successful OAuth.
                            </p>
                        </div>
                    )}
                    {integration.authType === "api-key" && (
                        <div>
                            <Label className="text-xs">API key</Label>
                            <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-… / ak-…" className="mt-1 font-mono" />
                        </div>
                    )}
                    {integration.authType === "url" && (
                        <div>
                            <Label className="text-xs">Server URL</Label>
                            <Input value={serverUrl} onChange={e => setServerUrl(e.target.value)} placeholder="https://mcp.example.com/v1" className="mt-1 font-mono" />
                            <p className="text-[10px] text-muted-foreground mt-1">Must implement the Model Context Protocol (MCP) spec.</p>
                        </div>
                    )}
                    {integration.id === "openclaw" && (
                        <div>
                            <Label className="text-xs">OpenClaw workspace ID (optional)</Label>
                            <Input value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} placeholder="haqq-beirut" className="mt-1" />
                        </div>
                    )}
                    {integration.id === "github" && (
                        <div>
                            <Label className="text-xs">Skills repo (optional)</Label>
                            <Input value={workspaceId} onChange={e => setWorkspaceId(e.target.value)} placeholder="orgname/louis-skills" className="mt-1 font-mono" />
                            <p className="text-[10px] text-muted-foreground mt-1">Louis will watch this repo for new skills (PR → review → merge).</p>
                        </div>
                    )}
                    {integration.signupUrl && (
                        <p className="text-[10px] text-muted-foreground">
                            Need an account? <a href={integration.signupUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Sign up at {integration.name}</a>.
                        </p>
                    )}
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting || (integration.authType === "api-key" && !apiKey.trim())}>
                        {submitting ? "Connecting…" : <><Check className="w-3.5 h-3.5 mr-1" /> Connect</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-2.5 py-1 text-xs rounded-full border ${active ? "bg-foreground text-white border-foreground" : "bg-card text-foreground/80 border-border hover:bg-muted"}`}
        >
            {children}
        </button>
    );
}
