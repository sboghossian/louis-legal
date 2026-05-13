"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Search, Activity, RefreshCw, Plus, Pencil, Trash2, Github, Upload, Download, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/app/contexts/ConfirmDialog";
import { useLocale } from "@/contexts/LocaleContext";

type RegistryEntry = {
    id: string;
    name: string;
    category: string;
    priority: "P0" | "P1" | "P2" | "P3";
    status: "stub" | "drafted" | "reviewed" | "shipped";
    intent?: string[];
    practice_area?: string;
    jurisdictions?: string[];
    filename: string;
};

type SkillDetail = {
    frontmatter: Record<string, unknown> & { id: string; name: string };
    prompt: string;
    path: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const STATUS_STYLE: Record<RegistryEntry["status"], string> = {
    shipped: "bg-green-100 text-green-700",
    reviewed: "bg-blue-100 text-blue-700",
    drafted: "bg-yellow-100 text-yellow-800",
    stub: "bg-muted text-muted-foreground",
};

const PRIORITY_STYLE: Record<RegistryEntry["priority"], string> = {
    P0: "bg-red-100 text-red-700",
    P1: "bg-orange-100 text-orange-700",
    P2: "bg-yellow-100 text-yellow-800",
    P3: "bg-muted text-muted-foreground",
};

interface RouteLog {
    ts: string;
    userId?: string;
    chatId?: string;
    messagePreview: string;
    intentPrimary: string;
    intentPracticeArea?: string;
    intentJurisdiction?: string;
    skillIds: string[];
    skillCount: number;
    systemPromptChars: number;
    classifierSource: "keyword" | "llm-fallback" | "hybrid";
    latencyMs?: number;
}
interface RouteStats {
    total: number;
    byIntent: Record<string, number>;
    bySource: Record<string, number>;
}

interface SyncConfig {
    repo: string;
    branch: string;
    path: string;
    hasToken: boolean;
    lastPullAt?: string;
    lastPullCount?: number;
    status: string;
}

export default function SkillsPage() {
    const router = useRouter();
    const confirm = useConfirm();
    const { t } = useLocale();
    const [view, setView] = useState<"library" | "observability">("library");
    const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
    const [showSyncSetup, setShowSyncSetup] = useState(false);
    const [syncWorking, setSyncWorking] = useState<string | null>(null);

    async function refreshSync() {
        try {
            const r = await fetch(`${API_BASE}/api/skills-sync/config`, { headers: { "x-user-id": "demo" } });
            if (r.ok) {
                const j = await r.json();
                setSyncConfig(j.config);
            }
        } catch (e) { console.error(e); }
    }
    useEffect(() => { refreshSync(); }, []);

    async function pullFromGithub() {
        if (!syncConfig) return;
        setSyncWorking("pull");
        try {
            await fetch(`${API_BASE}/api/skills-sync/pull`, { method: "POST", headers: { "x-user-id": "demo" } });
            // Backend simulates ~1.5s; poll once
            await new Promise(r => setTimeout(r, 2000));
            await refreshSync();
            window.location.reload();
        } finally {
            setSyncWorking(null);
        }
    }

    async function pushToGithub() {
        if (!syncConfig) return;
        setSyncWorking("push");
        try {
            const r = await fetch(`${API_BASE}/api/skills-sync/push`, { method: "POST", headers: { "x-user-id": "demo" } });
            const j = await r.json();
            if (j.prUrl) {
                const ok = await confirm({
                    title: "Pull request opened",
                    message: `${j.prUrl}\n\nOpen it in a new tab?`,
                    confirmLabel: "Open in browser",
                });
                if (ok) {
                    window.open(j.prUrl, "_blank");
                }
            }
        } finally {
            setSyncWorking(null);
        }
    }
    const [entries, setEntries] = useState<RegistryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeStatus, setActiveStatus] = useState<string | null>(null);
    const [selected, setSelected] = useState<SkillDetail | null>(null);

    // Observability state
    const [decisions, setDecisions] = useState<RouteLog[]>([]);
    const [stats, setStats] = useState<RouteStats | null>(null);
    const [testMessage, setTestMessage] = useState("Draft a mutual NDA between Acme and Globex for the UAE under DIFC law");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<RouteLog | null>(null);

    async function refreshDecisions() {
        try {
            const r = await fetch(`${API_BASE}/api/skills/route-debug`);
            if (r.ok) {
                const json = await r.json();
                setDecisions(json.decisions ?? []);
                setStats(json.stats ?? null);
            }
        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        if (view === "observability") refreshDecisions();
    }, [view]);

    async function runRouteTest() {
        if (!testMessage.trim()) return;
        setTesting(true);
        setTestResult(null);
        try {
            const r = await fetch(`${API_BASE}/api/skills/route-test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: testMessage }),
            });
            if (r.ok) {
                const json = await r.json();
                setTestResult({
                    ts: new Date().toISOString(),
                    messagePreview: testMessage.slice(0, 200),
                    intentPrimary: json.intent?.primary ?? "?",
                    intentPracticeArea: json.intent?.practiceArea,
                    intentJurisdiction: json.intent?.jurisdiction,
                    skillIds: json.skillIds ?? [],
                    skillCount: (json.skillIds ?? []).length,
                    systemPromptChars: (json.systemPromptExtra ?? "").length,
                    classifierSource: json.classifierSource ?? "keyword",
                });
                refreshDecisions();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTesting(false);
        }
    }

    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API_BASE}/api/skills/registry`);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                const json = await r.json();
                setEntries(json.entries ?? []);
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const categories = useMemo(() => {
        const counts = new Map<string, number>();
        entries.forEach(e => counts.set(e.category, (counts.get(e.category) ?? 0) + 1));
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [entries]);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return entries.filter(e => {
            if (activeCategory && e.category !== activeCategory) return false;
            if (activeStatus && e.status !== activeStatus) return false;
            if (needle) {
                const hay = (e.id + " " + e.name + " " + (e.intent ?? []).join(" ")).toLowerCase();
                if (!hay.includes(needle)) return false;
            }
            return true;
        });
    }, [entries, q, activeCategory, activeStatus]);

    async function openSkill(id: string) {
        setSelected(null);
        try {
            const r = await fetch(`${API_BASE}/api/skills/${encodeURIComponent(id)}`);
            if (r.ok) setSelected(await r.json());
        } catch (e) {
            console.error(e);
        }
    }

    if (view === "observability") {
        return (
            <ObservabilityView
                decisions={decisions}
                stats={stats}
                onBack={() => setView("library")}
                onRefresh={refreshDecisions}
                testMessage={testMessage}
                onTestMessageChange={setTestMessage}
                onRunTest={runRouteTest}
                testing={testing}
                testResult={testResult}
            />
        );
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left list */}
            <div className="w-[420px] flex-shrink-0 border-r border-border flex flex-col">
                <div className="px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5 text-foreground/80" />
                        <h1 className="text-lg font-semibold">{t("skills.title")}</h1>
                        <Badge variant="secondary">{entries.length}</Badge>
                        <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => setView("observability")}>
                            <Activity className="w-3.5 h-3.5 mr-1" />
                            {t("skills.router_btn")}
                        </Button>
                        <Button
                            size="sm"
                            variant={syncConfig ? "outline" : "ghost"}
                            className="h-7 text-xs"
                            onClick={() => setShowSyncSetup(true)}
                            title={syncConfig ? t("skills.sync.tooltip.synced", { repo: syncConfig.repo }) : t("skills.sync.tooltip.connect")}
                        >
                            <Github className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => router.push("/skills/new")}>
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            {t("action.new")}
                        </Button>
                    </div>
                    {syncConfig && (
                        <div className="flex items-center gap-2 px-1 mb-2 text-[10px] text-muted-foreground">
                            <Github className="w-3 h-3" />
                            <span className="font-mono truncate flex-1">{syncConfig.repo}@{syncConfig.branch}</span>
                            <button onClick={pullFromGithub} disabled={!!syncWorking} className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
                                <Download className="w-2.5 h-2.5" /> {syncWorking === "pull" ? t("skills.sync.pulling") : t("skills.sync.pull")}
                            </button>
                            <button onClick={pushToGithub} disabled={!!syncWorking} className="inline-flex items-center gap-0.5 text-blue-600 hover:underline">
                                <Upload className="w-2.5 h-2.5" /> {syncWorking === "push" ? t("skills.sync.pushing") : t("skills.sync.push")}
                            </button>
                        </div>
                    )}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder={t("skills.search_placeholder")}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        <FilterChip active={activeCategory === null} onClick={() => setActiveCategory(null)}>all</FilterChip>
                        {categories.map(([cat, n]) => (
                            <FilterChip
                                key={cat}
                                active={activeCategory === cat}
                                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                            >
                                {cat} · {n}
                            </FilterChip>
                        ))}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                        {(["P0", "P1", "P2", "P3"] as const).map(p => (
                            <FilterChip
                                key={p}
                                active={activeStatus === p}
                                onClick={() => setActiveStatus(activeStatus === p ? null : p)}
                            >
                                {p}
                            </FilterChip>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading && <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div>}
                    {error && <div className="p-6 text-sm text-red-600">{t("common.error_prefix")}: {error}</div>}
                    {filtered.map(e => (
                        <button
                            key={e.id}
                            onClick={() => openSkill(e.id)}
                            className={`w-full text-left px-5 py-3 border-b border-border hover:bg-muted ${selected?.frontmatter.id === e.id ? "bg-blue-50" : ""}`}
                        >
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLE[e.status]}`}>
                                    {e.status}
                                </span>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_STYLE[e.priority]}`}>
                                    {e.priority}
                                </span>
                                <span className="text-xs text-muted-foreground">{e.category}</span>
                            </div>
                            <div className="text-sm font-medium text-foreground truncate">{e.name}</div>
                            <div className="text-xs text-muted-foreground font-mono truncate">{e.id}</div>
                        </button>
                    ))}
                    {!loading && filtered.length === 0 && (
                        <div className="p-6 text-sm text-muted-foreground">{t("skills.empty")}</div>
                    )}
                </div>
            </div>

            {/* Right detail */}
            <div className="flex-1 overflow-y-auto">
                {!selected ? (
                    <div className="p-12 text-sm text-muted-foreground">
                        {t("skills.detail.empty")}
                        <div className="mt-4 text-xs">
                            <div>{t("skills.detail.total", { count: entries.length })}</div>
                            <div>Backend: <code className="bg-muted px-1 rounded">{API_BASE}/api/skills</code></div>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 max-w-3xl">
                        <div className="text-xs text-muted-foreground font-mono mb-1">{selected.frontmatter.id}</div>
                        <h1 className="text-2xl font-semibold mb-4">{selected.frontmatter.name}</h1>
                        <div className="flex flex-wrap gap-1.5 mb-6 text-xs">
                            {Object.entries(selected.frontmatter).map(([k, v]) => {
                                if (k === "id" || k === "name") return null;
                                const display = Array.isArray(v) ? v.join(", ") : String(v);
                                return (
                                    <span key={k} className="bg-muted px-2 py-1 rounded">
                                        <span className="text-muted-foreground">{k}:</span> <span className="text-foreground">{display}</span>
                                    </span>
                                );
                            })}
                        </div>
                        <div className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-xs bg-muted border border-border rounded-lg p-4">
                            {selected.prompt}
                        </div>
                        <div className="mt-4 flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(selected.prompt)}>
                                Copy body
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(selected.frontmatter.id as string)}>
                                Copy ID
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => router.push(`/skills/${encodeURIComponent(selected.frontmatter.id as string)}/edit`)}>
                                <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                            {!!(selected.frontmatter as unknown as Record<string, unknown>).custom && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 self-center">custom</Badge>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showSyncSetup && (
                <SyncSetupModal
                    initial={syncConfig}
                    onClose={() => setShowSyncSetup(false)}
                    onSaved={() => { setShowSyncSetup(false); refreshSync(); }}
                    onDisconnect={async () => {
                        await fetch(`${API_BASE}/api/skills-sync/config`, { method: "DELETE", headers: { "x-user-id": "demo" } });
                        setShowSyncSetup(false);
                        refreshSync();
                    }}
                />
            )}
        </div>
    );
}

function SyncSetupModal({ initial, onClose, onSaved, onDisconnect }: {
    initial: SyncConfig | null;
    onClose: () => void;
    onSaved: () => void;
    onDisconnect: () => void;
}) {
    const [repo, setRepo] = useState(initial?.repo || "");
    const [branch, setBranch] = useState(initial?.branch || "main");
    const [path, setPath] = useState(initial?.path || "skills");
    const [token, setToken] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function save() {
        if (!repo.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const r = await fetch(`${API_BASE}/api/skills-sync/config`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": "demo" },
                body: JSON.stringify({ repo, branch, path, token: token || undefined }),
            });
            if (!r.ok) {
                const j = await r.json();
                throw new Error(j.error || `HTTP ${r.status}`);
            }
            onSaved();
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
                    <h2 className="font-semibold flex items-center gap-2">
                        <Github className="w-5 h-5" /> GitHub skills sync
                    </h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="px-6 py-4 space-y-3">
                    <p className="text-xs text-muted-foreground">
                        Point Louis at a GitHub repo of .md skill files. <strong>Pull</strong> syncs them into Louis;
                        <strong> push</strong> opens a PR with your local custom skills.
                    </p>
                    <div>
                        <Label className="text-xs">Repo (owner/name)</Label>
                        <Input value={repo} onChange={e => setRepo(e.target.value)} placeholder="haqq-inc/louis-skills" className="mt-1 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Branch</Label>
                            <Input value={branch} onChange={e => setBranch(e.target.value)} className="mt-1 font-mono" />
                        </div>
                        <div>
                            <Label className="text-xs">Path</Label>
                            <Input value={path} onChange={e => setPath(e.target.value)} className="mt-1 font-mono" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">GitHub token (optional, for private repos / push)</Label>
                        <Input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_…" className="mt-1 font-mono" />
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Scopes needed: <code>repo</code> (for private) or <code>public_repo</code> (for public).
                            {initial?.hasToken && " A token is already stored."}
                        </p>
                    </div>
                    {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
                </div>
                <div className="px-6 py-4 border-t flex items-center justify-between gap-2">
                    {initial ? (
                        <Button variant="ghost" className="text-red-600" onClick={onDisconnect}>Disconnect</Button>
                    ) : <span />}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={save} disabled={submitting || !repo.trim()}>
                            {submitting ? "Saving…" : initial ? "Update" : "Connect"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-2 py-0.5 rounded-full text-xs border ${active ? "bg-foreground text-white border-foreground" : "bg-card text-foreground/80 border-border hover:bg-muted"}`}
        >
            {children}
        </button>
    );
}

function ObservabilityView({
    decisions, stats, onBack, onRefresh,
    testMessage, onTestMessageChange, onRunTest, testing, testResult,
}: {
    decisions: RouteLog[];
    stats: RouteStats | null;
    onBack: () => void;
    onRefresh: () => void;
    testMessage: string;
    onTestMessageChange: (v: string) => void;
    onRunTest: () => void;
    testing: boolean;
    testResult: RouteLog | null;
}) {
    const SRC_COLOR: Record<string, string> = {
        keyword: "bg-blue-100 text-blue-700",
        "llm-fallback": "bg-purple-100 text-purple-700",
        hybrid: "bg-amber-100 text-amber-800",
    };

    const formatTs = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    return (
        <div className="max-w-5xl mx-auto px-8 py-6">
            <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5" />
                <h1 className="text-lg font-semibold">Skills Router · Observability</h1>
                <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={onBack}>
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Library
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRefresh}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-6">
                Last 200 routing decisions (in-memory ring buffer). Each chat turn picks 8-13 skills based on intent + jurisdiction + practice area.
            </p>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Total decisions</div>
                        <div className="text-2xl font-semibold mt-1">{stats.total}</div>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">By intent</div>
                        <div className="space-y-1">
                            {Object.entries(stats.byIntent).sort((a,b) => b[1]-a[1]).map(([k,v]) => (
                                <div key={k} className="flex justify-between text-xs"><span className="text-foreground/80">{k}</span><span className="text-muted-foreground">{v}</span></div>
                            ))}
                        </div>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">By classifier</div>
                        <div className="space-y-1">
                            {Object.entries(stats.bySource).map(([k,v]) => (
                                <div key={k} className="flex justify-between text-xs"><span className="text-foreground/80">{k}</span><span className="text-muted-foreground">{v}</span></div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Test box */}
            <div className="border border-border rounded-lg p-4 mb-8">
                <div className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-2">Test the router</div>
                <textarea
                    value={testMessage}
                    onChange={e => onTestMessageChange(e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-border rounded p-2 font-mono"
                    placeholder='try Arabic / French / drafting / review / research…'
                />
                <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" onClick={onRunTest} disabled={testing}>
                        {testing ? "running…" : "Route this"}
                    </Button>
                    {testResult && (
                        <span className="text-xs text-muted-foreground">
                            intent: <strong>{testResult.intentPrimary}</strong> · juris: {testResult.intentJurisdiction ?? "—"} · skills: {testResult.skillCount} · {testResult.systemPromptChars} chars
                        </span>
                    )}
                </div>
                {testResult && (
                    <div className="mt-3 text-xs text-muted-foreground">
                        <span className="text-muted-foreground">skills loaded: </span>
                        <span className="font-mono">{testResult.skillIds.join(", ")}</span>
                    </div>
                )}
            </div>

            {/* Decisions list */}
            <div className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-3">Recent decisions ({decisions.length})</div>
            <div className="border border-border rounded-lg divide-y divide-border">
                {decisions.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No decisions yet. Run a chat from /assistant or test above.
                    </div>
                )}
                {decisions.map((d, i) => (
                    <div key={i} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-muted-foreground">{formatTs(d.ts)}</span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${SRC_COLOR[d.classifierSource] || "bg-muted text-muted-foreground"}`}>
                                {d.classifierSource}
                            </span>
                            <span className="text-xs font-semibold">{d.intentPrimary}</span>
                            {d.intentPracticeArea && <span className="text-[10px] text-muted-foreground">· {d.intentPracticeArea}</span>}
                            {d.intentJurisdiction && <span className="text-[10px] text-muted-foreground">· {d.intentJurisdiction}</span>}
                            <span className="ml-auto text-[10px] text-muted-foreground">
                                {d.skillCount} skills · {d.systemPromptChars} chars{d.latencyMs != null ? ` · ${d.latencyMs}ms` : ""}
                            </span>
                        </div>
                        <div className="text-xs text-foreground/80 italic truncate">{d.messagePreview}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-1 truncate">{d.skillIds.slice(0, 6).join(", ")}{d.skillIds.length > 6 ? ` (+${d.skillIds.length - 6})` : ""}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
