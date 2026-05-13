"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, Copy, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ClauseListItem = {
    id: string;
    title: string;
    category: string;
    jurisdictions: string[];
    language: "en" | "ar" | "fr";
    position: "neutral" | "party-A" | "party-B";
    tags?: string[];
};

type ClauseDetail = ClauseListItem & {
    body: string;
    notes?: string;
    risk_flags?: string[];
    alternates?: string[];
};

type ClauseMeta = {
    total: number;
    categories: { category: string; count: number }[];
    jurisdictions: { jurisdiction: string; count: number }[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

const POSITION_STYLE: Record<ClauseListItem["position"], string> = {
    neutral: "bg-muted text-foreground/80",
    "party-A": "bg-blue-100 text-blue-700",
    "party-B": "bg-purple-100 text-purple-700",
};

const LANG_STYLE: Record<ClauseListItem["language"], string> = {
    en: "bg-emerald-50 text-emerald-700",
    ar: "bg-amber-50 text-amber-800",
    fr: "bg-rose-50 text-rose-700",
};

export default function ClausesPage() {
    const [items, setItems] = useState<ClauseListItem[]>([]);
    const [meta, setMeta] = useState<ClauseMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [q, setQ] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [activeJurisdiction, setActiveJurisdiction] = useState<string | null>(null);
    const [activeLang, setActiveLang] = useState<string | null>(null);
    const [activePosition, setActivePosition] = useState<string | null>(null);
    const [selected, setSelected] = useState<ClauseDetail | null>(null);
    const [comparing, setComparing] = useState<ClauseDetail | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [listR, metaR] = await Promise.all([
                    fetch(`${API_BASE}/api/clauses`),
                    fetch(`${API_BASE}/api/clauses/meta`),
                ]);
                if (!listR.ok) throw new Error(`HTTP ${listR.status}`);
                const list = await listR.json();
                const m = await metaR.json();
                setItems(list.results ?? []);
                setMeta(m);
            } catch (e) {
                setError((e as Error).message);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return items.filter(c => {
            if (activeCategory && c.category !== activeCategory) return false;
            if (activeJurisdiction && !c.jurisdictions.includes(activeJurisdiction)) return false;
            if (activeLang && c.language !== activeLang) return false;
            if (activePosition && c.position !== activePosition) return false;
            if (needle) {
                const hay = (c.id + " " + c.title + " " + (c.tags ?? []).join(" ")).toLowerCase();
                if (!hay.includes(needle)) return false;
            }
            return true;
        });
    }, [items, q, activeCategory, activeJurisdiction, activeLang, activePosition]);

    async function openClause(id: string, side: "main" | "compare" = "main") {
        try {
            const r = await fetch(`${API_BASE}/api/clauses/${encodeURIComponent(id)}`);
            if (r.ok) {
                const detail = await r.json();
                if (side === "main") setSelected(detail);
                else setComparing(detail);
            }
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left list */}
            <div className="w-[420px] flex-shrink-0 border-r border-border flex flex-col">
                <div className="px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-5 h-5 text-foreground/80" />
                        <h1 className="text-lg font-semibold">Clause Library</h1>
                        <Badge variant="secondary">{items.length}</Badge>
                    </div>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search clauses…"
                            className="pl-9"
                        />
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3 mb-1">Category</div>
                    <div className="flex flex-wrap gap-1.5">
                        <FilterChip active={activeCategory === null} onClick={() => setActiveCategory(null)}>all</FilterChip>
                        {meta?.categories.sort((a, b) => b.count - a.count).map(c => (
                            <FilterChip
                                key={c.category}
                                active={activeCategory === c.category}
                                onClick={() => setActiveCategory(activeCategory === c.category ? null : c.category)}
                            >
                                {c.category} · {c.count}
                            </FilterChip>
                        ))}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3 mb-1">Jurisdiction</div>
                    <div className="flex flex-wrap gap-1.5">
                        {meta?.jurisdictions.sort((a, b) => b.count - a.count).slice(0, 12).map(j => (
                            <FilterChip
                                key={j.jurisdiction}
                                active={activeJurisdiction === j.jurisdiction}
                                onClick={() => setActiveJurisdiction(activeJurisdiction === j.jurisdiction ? null : j.jurisdiction)}
                            >
                                {j.jurisdiction} · {j.count}
                            </FilterChip>
                        ))}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-3 mb-1">Language · Position</div>
                    <div className="flex gap-1.5">
                        {(["en", "ar", "fr"] as const).map(l => (
                            <FilterChip
                                key={l}
                                active={activeLang === l}
                                onClick={() => setActiveLang(activeLang === l ? null : l)}
                            >
                                {l}
                            </FilterChip>
                        ))}
                        <span className="w-px bg-muted mx-1" />
                        {(["neutral", "party-A", "party-B"] as const).map(p => (
                            <FilterChip
                                key={p}
                                active={activePosition === p}
                                onClick={() => setActivePosition(activePosition === p ? null : p)}
                            >
                                {p}
                            </FilterChip>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading && <div className="p-6 text-sm text-muted-foreground">loading…</div>}
                    {error && <div className="p-6 text-sm text-red-600">error: {error}</div>}
                    {filtered.map(c => (
                        <button
                            key={c.id}
                            onClick={() => openClause(c.id)}
                            className={`w-full text-left px-5 py-3 border-b border-border hover:bg-muted ${selected?.id === c.id ? "bg-blue-50" : ""}`}
                        >
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${LANG_STYLE[c.language]}`}>
                                    {c.language}
                                </span>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${POSITION_STYLE[c.position]}`}>
                                    {c.position}
                                </span>
                                <span className="text-xs text-muted-foreground">{c.category}</span>
                            </div>
                            <div className="text-sm font-medium text-foreground truncate">{c.title}</div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">{c.id} · {c.jurisdictions.join(", ")}</div>
                        </button>
                    ))}
                    {!loading && filtered.length === 0 && (
                        <div className="p-6 text-sm text-muted-foreground">no clauses match</div>
                    )}
                </div>
            </div>

            {/* Right detail */}
            <div className="flex-1 overflow-y-auto">
                {!selected ? (
                    <div className="p-12 text-sm text-muted-foreground">
                        <p>Select a clause to view the full text, drafting notes, and jurisdiction-specific risk flags.</p>
                        <div className="mt-4 text-xs">
                            <div>Total: {items.length}</div>
                            <div>Backend: <code className="bg-muted px-1 rounded">{API_BASE}/api/clauses</code></div>
                        </div>
                    </div>
                ) : (
                    <div className={`flex ${comparing ? "divide-x divide-border" : ""}`}>
                        <ClausePane
                            clause={selected}
                            comparing={!!comparing}
                            onAlternate={(id) => openClause(id)}
                            onCompare={(id) => openClause(id, "compare")}
                            onCloseCompare={() => setComparing(null)}
                            showCompareButton={!comparing}
                        />
                        {comparing && (
                            <ClausePane
                                clause={comparing}
                                comparing={true}
                                onAlternate={(id) => openClause(id, "compare")}
                                onCompare={() => {}}
                                onCloseCompare={() => setComparing(null)}
                                showCompareButton={false}
                                isCompare={true}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function ClausePane({
    clause,
    comparing,
    onAlternate,
    onCompare,
    onCloseCompare,
    showCompareButton,
    isCompare = false,
}: {
    clause: ClauseDetail;
    comparing: boolean;
    onAlternate: (id: string) => void;
    onCompare: (id: string) => void;
    onCloseCompare: () => void;
    showCompareButton: boolean;
    isCompare?: boolean;
}) {
    return (
        <div className={`${comparing ? "w-1/2" : "w-full"} p-8 max-w-3xl`}>
            <div className="flex items-start justify-between mb-1">
                <div className="text-xs text-muted-foreground font-mono">{clause.id}</div>
                {isCompare && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCloseCompare}>
                        close
                    </Button>
                )}
            </div>
            <h1 className="text-xl font-semibold mb-3">{clause.title}</h1>
            <div className="flex flex-wrap gap-1.5 mb-4 text-xs">
                <span className={`px-2 py-0.5 rounded ${LANG_STYLE[clause.language]}`}>{clause.language}</span>
                <span className={`px-2 py-0.5 rounded ${POSITION_STYLE[clause.position]}`}>{clause.position}</span>
                {clause.jurisdictions.map(j => (
                    <span key={j} className="bg-muted text-foreground/80 px-2 py-0.5 rounded">{j}</span>
                ))}
            </div>

            <div className="bg-muted border border-border rounded-lg p-4 text-sm whitespace-pre-wrap font-serif mb-4" dir={clause.language === "ar" ? "rtl" : "ltr"}>
                {clause.body}
            </div>

            <div className="flex gap-2 mb-6">
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(clause.body)}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy clause
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(clause.id)}>
                    Copy ID
                </Button>
            </div>

            {clause.notes && (
                <div className="mb-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Drafting notes</div>
                    <div className="text-sm text-foreground/80 bg-blue-50/40 border border-blue-100 rounded p-3 whitespace-pre-wrap">{clause.notes}</div>
                </div>
            )}

            {clause.risk_flags && clause.risk_flags.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Risk flags
                    </div>
                    <ul className="text-sm text-foreground/80 bg-amber-50/40 border border-amber-200 rounded p-3 space-y-1.5 list-disc list-inside">
                        {clause.risk_flags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                </div>
            )}

            {clause.alternates && clause.alternates.length > 0 && (
                <div className="mb-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Alternates</div>
                    <div className="flex flex-wrap gap-1.5">
                        {clause.alternates.map(altId => (
                            <div key={altId} className="inline-flex items-center bg-muted rounded text-xs">
                                <button
                                    onClick={() => onAlternate(altId)}
                                    className="px-2 py-1 hover:bg-muted rounded-l font-mono"
                                >
                                    {altId}
                                </button>
                                {showCompareButton && (
                                    <button
                                        onClick={() => onCompare(altId)}
                                        title="Compare side-by-side"
                                        className="px-2 py-1 hover:bg-muted rounded-r border-l border-border"
                                    >
                                        <ArrowLeftRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
