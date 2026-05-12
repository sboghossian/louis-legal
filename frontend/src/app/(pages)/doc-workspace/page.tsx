"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    FileText, MessageSquare, ListChecks, History, ListOrdered, MessageCircle,
    Edit3, Glasses, GitCompare,
    AlertTriangle, Users, BookText, Quote, Scale,
    ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen,
    Save, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

interface DocMetadata {
    id: string;
    title: string;
    filename: string;
    fileType: string | null;
    wordCount: number | null;
    readingMin: number | null;
    currentVersionId: string | null;
    jurisdiction: { primary: string; secondary: string[] } | null;
    parties: { role: string; name: string; details: string }[];
    definitions: string[];
    citations: { ref: string; note: string }[];
    source: "fixture" | "live";
}

interface ServerSuggestion {
    id: string;
    section: string;
    severity: "high" | "medium" | "low";
    title: string;
    rationale: string;
    proposed: string;
    state: "open" | "accepted" | "rejected";
    createdAt: string;
}

// SCAFFOLD ported from haqq-prototype: renderDocEditor / renderDocRailV3 / renderCompareToolbar.
// Top bar (title/save/tone/wordcount), left pane (tabs), center (view modes), right rail (5 accordions).
// Real doc CRUD wiring is next-session work; this page renders against in-memory fixtures.

type DocTab = "chat" | "suggestions" | "versions" | "outline" | "comments";
type DocView = "edit" | "review" | "read" | "compare";

type Suggestion = ServerSuggestion;

interface DocBlock {
    id: string;
    heading?: string;
    text: string;
    changed?: boolean;
}

// ----- Fixture data (matches the prototype's DOC_* shape) -----

const DOC_DEFAULT = {
    title: "Acme x Globex — Master Services Agreement (v3)",
    savedAt: "9:45 AM",
    wordCount: 612,
    readingMin: 3,
};

const DOC_BLOCKS: DocBlock[] = [
    { id: "b1", heading: "1. Definitions", text: "In this Agreement, the following terms shall have the meanings ascribed: 'Affiliate' means any entity controlling, controlled by, or under common control with a Party; 'Business Day' means any day other than Friday or Saturday on which banks in the United Arab Emirates are open." },
    { id: "b2", heading: "2. Services", text: "Provider shall perform the services described in each SOW signed under this MSA. Services shall be performed in a professional and workmanlike manner consistent with industry standards." },
    { id: "b3", heading: "3. Fees and Payment", text: "Client shall pay Provider the fees set forth in each SOW. Invoices are due 30 days from receipt. Late payments accrue interest at the lesser of 1.5% per month or the maximum rate permitted by law.", changed: true },
    { id: "b4", heading: "4. Intellectual Property", text: "Provider retains all right, title, and interest in pre-existing IP. Foreground IP developed under any SOW is assigned to Client upon full payment, subject to a perpetual, royalty-free license back to Provider for internal use." },
    { id: "b5", heading: "5. Confidentiality", text: "Each Party shall hold the other's Confidential Information in strict confidence and not disclose to any third party except on a need-to-know basis to Affiliates and professional advisors bound by confidentiality obligations." },
    { id: "b6", heading: "6. Limitation of Liability", text: "EACH PARTY'S TOTAL CUMULATIVE LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE FEES PAID OR PAYABLE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, EXCEPT FOR (I) BREACH OF CONFIDENTIALITY, (II) IP INDEMNIFICATION, (III) WILLFUL MISCONDUCT OR FRAUD.", changed: true },
    { id: "b7", heading: "7. Governing Law and Dispute Resolution", text: "This Agreement is governed by the laws of the Emirate of Dubai and applicable UAE federal laws. Disputes shall be resolved by binding arbitration under the DIAC Arbitration Rules, seat Dubai (DIFC), in English." },
];

// (Server is the source of truth for suggestions now via /api/doc-workspace/:docId/suggestions.
// Tab badge count comes from runtime `suggestions` state.)

const DOC_VERSIONS = [
    { id: "v3", label: "v3 (current)",   author: "You",          when: "Today, 9:45 AM",    summary: "Tightened liability cap; added carve-outs." },
    { id: "v2", label: "v2",              author: "Counterparty", when: "Yesterday, 4:12 PM", summary: "Counterparty broadened indemnity scope." },
    { id: "v1", label: "v1 (initial)",   author: "You",          when: "Mar 8, 11:02 AM",   summary: "First draft from MSA template." },
];

const DOC_PARTIES = [
    { role: "Provider", name: "Acme Tech FZ-LLC",      details: "DMCC, Dubai, UAE" },
    { role: "Client",   name: "Globex Trading L.L.C.", details: "Onshore Dubai, UAE — Trade Lic 12345" },
];

const DOC_DEFS = [
    "Affiliate",
    "Business Day",
    "Confidential Information",
    "Effective Date",
    "Foreground IP",
    "SOW (Statement of Work)",
];

const DOC_CITES = [
    { ref: "UAE Federal Decree-Law 50/2022 art 35", note: "Late-payment interest caps" },
    { ref: "DIAC Arbitration Rules 2022",            note: "Seat / procedure" },
    { ref: "DIFC Law 5/2008",                        note: "Implied terms" },
];

const DOC_COMMENTS = [
    { author: "Lazar",    role: "Partner",  text: "Push on 24-month liability cap — Acme has leverage here.", when: "2h ago" },
    { author: "Rawad",    role: "Associate", text: "Confirmed: client wants UAE seat. ADGM is dealbreaker.", when: "5h ago" },
    { author: "You",      role: "—",        text: "Will tighten Section 4 IP language.", when: "yesterday" },
];

const SEVERITY_STYLE: Record<Suggestion["severity"], string> = {
    high:   "bg-red-100 text-red-700 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low:    "bg-blue-50 text-blue-700 border-blue-200",
};

const SEVERITY_DOT: Record<Suggestion["severity"], string> = {
    high:   "bg-red-500",
    medium: "bg-yellow-500",
    low:    "bg-blue-400",
};

// ----- Component -----

export default function DocWorkspacePage() {
    return (
        <Suspense fallback={<div className="p-12 text-sm text-gray-500">loading workspace…</div>}>
            <DocWorkspaceInner />
        </Suspense>
    );
}

function DocWorkspaceInner() {
    const params = useSearchParams();
    const router = useRouter();
    const docId = params.get("docId") || "demo";

    const [tab, setTab] = useState<DocTab>("suggestions");
    const [view, setView] = useState<DocView>("edit");
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightOpen, setRightOpen] = useState(true);
    const [tone, setTone] = useState(50);
    const [accOpen, setAccOpen] = useState({
        risk: true,
        parties: true,
        defs: false,
        cites: false,
        juris: true,
    });

    const [meta, setMeta] = useState<DocMetadata | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Load metadata + suggestions
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const headers = await authHeaders();
                const [mr, sr] = await Promise.all([
                    fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/metadata`, { headers, cache: "no-store" }),
                    fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/suggestions`, { headers, cache: "no-store" }),
                ]);
                if (cancelled) return;
                if (mr.ok) setMeta(await mr.json());
                else setLoadError(`metadata: HTTP ${mr.status}`);
                if (sr.ok) {
                    const json = await sr.json();
                    setSuggestions(json.suggestions ?? []);
                }
            } catch (e) {
                if (!cancelled) setLoadError((e as Error).message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [docId]);

    async function updateSuggestion(sugId: string, state: Suggestion["state"]) {
        // Optimistic
        setSuggestions(prev => prev.map(s => s.id === sugId ? { ...s, state } : s));
        try {
            const headers = await authHeaders();
            await fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/suggestions/${encodeURIComponent(sugId)}`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ state }),
            });
        } catch (e) {
            console.error(e);
        }
    }

    function openInBoard() {
        const openSugs = suggestions.filter(s => s.state === "open");
        const ids = openSugs.map(s => s.id).join(",");
        router.push(`/drafting-board?docId=${encodeURIComponent(docId)}&suggestions=${encodeURIComponent(ids)}`);
    }

    const toneLabel = tone < 33 ? "plain" : tone < 67 ? "balanced" : "formal";

    const visibleBlocks = useMemo(() => {
        if (view === "compare") return DOC_BLOCKS.filter(b => b.changed);
        return DOC_BLOCKS;
    }, [view]);

    const title = meta?.title || DOC_DEFAULT.title;
    const wordCount = meta?.wordCount ?? DOC_DEFAULT.wordCount;
    const readingMin = meta?.readingMin ?? DOC_DEFAULT.readingMin;
    const partiesData = meta?.parties && meta.parties.length ? meta.parties : DOC_PARTIES;
    const defsData = meta?.definitions && meta.definitions.length ? meta.definitions : DOC_DEFS;
    const citesData = meta?.citations && meta.citations.length ? meta.citations : DOC_CITES;
    const jurisdictionLabel = meta?.jurisdiction
        ? `${meta.jurisdiction.primary}${meta.jurisdiction.secondary?.length ? " / " + meta.jurisdiction.secondary.join(", ") : ""}`
        : "UAE / DIFC";

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Top bar */}
            <div className="border-b border-gray-200 px-5 py-3 flex items-center gap-4 flex-shrink-0">
                <FileText className="w-5 h-5 text-gray-700" />
                <div className="flex-1">
                    <div className="font-semibold text-sm flex items-center gap-2">
                        {title}
                        {meta?.source === "fixture" && <Badge variant="secondary" className="text-[10px]">demo</Badge>}
                        {meta?.source === "live" && <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">live</Badge>}
                        {loadError && <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">{loadError}</Badge>}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Save className="w-3 h-3" /> saved {DOC_DEFAULT.savedAt}</span>
                        {wordCount != null && <span>{wordCount} words</span>}
                        {readingMin != null && <span>{readingMin} min read</span>}
                        <span className="font-mono opacity-50">docId: {docId}</span>
                    </div>
                </div>

                {/* View mode toggle */}
                <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                    {(["edit", "review", "read", "compare"] as const).map(v => {
                        const Icon = v === "edit" ? Edit3 : v === "review" ? ListChecks : v === "read" ? Glasses : GitCompare;
                        return (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded ${view === v ? "bg-white shadow-sm font-medium" : "text-gray-600 hover:text-gray-900"}`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {v}
                            </button>
                        );
                    })}
                </div>

                {/* Tone slider */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-12 text-right">tone</span>
                    <input
                        type="range"
                        min={0} max={100} step={1}
                        value={tone}
                        onChange={e => setTone(parseInt(e.target.value))}
                        className="w-20 accent-gray-900"
                    />
                    <span className="text-xs font-medium text-gray-700 w-14">{toneLabel}</span>
                </div>

                <Button size="sm" variant="outline" onClick={openInBoard}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Open in Board
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRightOpen(o => !o)}>
                    {rightOpen ? "Hide rail" : "Show rail"}
                </Button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left pane: tabs + tab content */}
                <div className={`border-r border-gray-200 flex flex-col flex-shrink-0 transition-all ${leftCollapsed ? "w-12" : "w-[340px]"}`}>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
                        {!leftCollapsed && (
                            <div className="flex gap-1">
                                <DocTabBtn icon={MessageSquare}  label="Chat"        active={tab === "chat"}        onClick={() => setTab("chat")} />
                                <DocTabBtn icon={ListChecks}     label="Suggestions" active={tab === "suggestions"} onClick={() => setTab("suggestions")} badge={suggestions.length} />
                                <DocTabBtn icon={History}        label="Versions"    active={tab === "versions"}    onClick={() => setTab("versions")} />
                                <DocTabBtn icon={ListOrdered}    label="Outline"     active={tab === "outline"}     onClick={() => setTab("outline")} />
                                <DocTabBtn icon={MessageCircle}  label="Comments"    active={tab === "comments"}    onClick={() => setTab("comments")} badge={DOC_COMMENTS.length} />
                            </div>
                        )}
                        <button onClick={() => setLeftCollapsed(c => !c)} className="text-gray-500 hover:text-gray-900 ml-auto">
                            {leftCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                        </button>
                    </div>

                    {!leftCollapsed && (
                        <div className="flex-1 overflow-y-auto">
                            {tab === "chat" && <ChatTab docId={docId} />}
                            {tab === "suggestions" && (
                                <SuggestionsTab
                                    suggestions={suggestions}
                                    loading={loading}
                                    onAccept={(id) => updateSuggestion(id, "accepted")}
                                    onReject={(id) => updateSuggestion(id, "rejected")}
                                    onReopen={(id) => updateSuggestion(id, "open")}
                                />
                            )}
                            {tab === "versions" && <VersionsTab />}
                            {tab === "outline" && <OutlineTab />}
                            {tab === "comments" && <CommentsTab />}
                        </div>
                    )}
                </div>

                {/* Center: document */}
                <div className="flex-1 overflow-y-auto bg-gray-50">
                    <div className="max-w-3xl mx-auto px-8 py-10">
                        {view === "compare" && (
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center gap-2">
                                <GitCompare className="w-3.5 h-3.5" />
                                <span>Showing only sections changed vs <strong>v2</strong>. Switch to <button className="underline" onClick={() => setView("edit")}>edit</button> to see the full document.</span>
                            </div>
                        )}
                        <div className="bg-white border border-gray-200 rounded-lg p-10 shadow-sm">
                            {visibleBlocks.map(b => (
                                <DocBlockView key={b.id} block={b} view={view} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right rail */}
                {rightOpen && (
                    <div className="w-[300px] border-l border-gray-200 flex-shrink-0 overflow-y-auto">
                        <Accordion title="Risk" icon={AlertTriangle} count={`${suggestions.filter(s => s.severity === "high" && s.state === "open").length} high · open`} open={accOpen.risk} onToggle={() => setAccOpen(s => ({...s, risk: !s.risk}))}>
                            <ul className="space-y-2">
                                {suggestions.map(s => (
                                    <li key={s.id} className={`text-xs ${s.state !== "open" ? "opacity-50" : ""}`}>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[s.severity]}`} />
                                            <span className="font-medium text-gray-900 truncate">{s.title}</span>
                                        </div>
                                        <div className="text-gray-500 ml-3 truncate">{s.section}</div>
                                    </li>
                                ))}
                                {!suggestions.length && <li className="text-xs text-gray-500">no suggestions</li>}
                            </ul>
                        </Accordion>

                        <Accordion title="Parties" icon={Users} count={`${partiesData.length}`} open={accOpen.parties} onToggle={() => setAccOpen(s => ({...s, parties: !s.parties}))}>
                            <ul className="space-y-2">
                                {partiesData.map((p, i) => (
                                    <li key={i} className="text-xs">
                                        <div className="font-medium text-gray-900">{p.name}</div>
                                        <div className="text-gray-500">{p.role} · {p.details}</div>
                                    </li>
                                ))}
                            </ul>
                        </Accordion>

                        <Accordion title="Definitions" icon={BookText} count={`${defsData.length}`} open={accOpen.defs} onToggle={() => setAccOpen(s => ({...s, defs: !s.defs}))}>
                            <ul className="text-xs space-y-1 text-gray-700">
                                {defsData.map((d, i) => <li key={i}>· {d}</li>)}
                            </ul>
                        </Accordion>

                        <Accordion title="Citations" icon={Quote} count={`${citesData.length}`} open={accOpen.cites} onToggle={() => setAccOpen(s => ({...s, cites: !s.cites}))}>
                            <ul className="space-y-2">
                                {citesData.map((c, i) => (
                                    <li key={i} className="text-xs">
                                        <div className="font-mono text-gray-800">{c.ref}</div>
                                        <div className="text-gray-500">{c.note}</div>
                                    </li>
                                ))}
                            </ul>
                        </Accordion>

                        <Accordion title="Jurisdiction" icon={Scale} count={jurisdictionLabel} open={accOpen.juris} onToggle={() => setAccOpen(s => ({...s, juris: !s.juris}))}>
                            <div className="text-xs space-y-1.5 text-gray-700">
                                <div><span className="text-gray-500">Governing law:</span> {jurisdictionLabel}</div>
                                <div><span className="text-gray-500">Seat of arbitration:</span> DIAC, DIFC</div>
                                <div><span className="text-gray-500">Language:</span> English controls</div>
                                <div><span className="text-gray-500">Notarization:</span> Not required for this document type</div>
                            </div>
                        </Accordion>
                    </div>
                )}
            </div>
        </div>
    );
}

// ----- Subcomponents -----

function DocTabBtn({ icon: Icon, label, active, onClick, badge }: { icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; onClick: () => void; badge?: number }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${active ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badge != null && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{badge}</Badge>}
        </button>
    );
}

function Accordion({ title, icon: Icon, count, open, onToggle, children }: { title: string; icon: React.ComponentType<{ className?: string }>; count?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <div className="border-b border-gray-200">
            <button onClick={onToggle} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50">
                {open ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
                <Icon className="w-4 h-4 text-gray-700" />
                <span className="text-sm font-medium text-gray-900 flex-1 text-left">{title}</span>
                {count && <span className="text-xs text-gray-500">{count}</span>}
            </button>
            {open && <div className="px-4 pb-3">{children}</div>}
        </div>
    );
}

function DocBlockView({ block, view }: { block: DocBlock; view: DocView }) {
    if (view === "review") {
        return (
            <div className={`mb-6 -mx-4 px-4 py-2 rounded ${block.changed ? "bg-yellow-50 ring-1 ring-yellow-200" : ""}`}>
                {block.heading && <h2 className="font-semibold text-gray-900 mb-2">{block.heading}</h2>}
                <p className="text-sm text-gray-800 leading-relaxed">{block.text}</p>
                {block.changed && <div className="mt-2 text-xs text-yellow-700">⚠️ this section has open suggestions</div>}
            </div>
        );
    }
    if (view === "read") {
        return (
            <div className="mb-6">
                {block.heading && <h2 className="text-xl font-serif text-gray-900 mb-3">{block.heading}</h2>}
                <p className="text-base font-serif text-gray-800 leading-loose">{block.text}</p>
            </div>
        );
    }
    return (
        <div className="mb-6">
            {block.heading && <h2 className="font-semibold text-gray-900 mb-2">{block.heading}</h2>}
            <p className="text-sm text-gray-800 leading-relaxed">{block.text}</p>
        </div>
    );
}

function ChatTab({ docId }: { docId: string }) {
    return (
        <div className="p-4 text-sm text-gray-600">
            <div className="mb-3 text-gray-900 font-medium">In-doc chat</div>
            <p className="text-xs">Ask Louis about this document. Examples:</p>
            <ul className="mt-2 space-y-1.5 text-xs">
                <li className="px-2 py-1.5 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">&ldquo;Tighten Section 4 IP language for Provider-favourable position&rdquo;</li>
                <li className="px-2 py-1.5 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">&ldquo;What&apos;s the typical liability cap for this contract type in DIFC?&rdquo;</li>
                <li className="px-2 py-1.5 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">&ldquo;Generate a counter-proposal email summarizing my asks&rdquo;</li>
            </ul>
            <div className="mt-6 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                <strong>Scaffold:</strong> wire chat input to <code>POST /chat</code> with docId={docId} in context. The skills router auto-routes review-intent skills for this doc.
            </div>
        </div>
    );
}

function SuggestionsTab({ suggestions, loading, onAccept, onReject, onReopen }: {
    suggestions: Suggestion[];
    loading: boolean;
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
    onReopen: (id: string) => void;
}) {
    if (loading && !suggestions.length) {
        return <div className="p-4 text-xs text-gray-500">loading suggestions…</div>;
    }
    if (!suggestions.length) {
        return <div className="p-4 text-xs text-gray-500">no suggestions for this document yet</div>;
    }
    return (
        <div className="p-2">
            {suggestions.map(s => {
                const state = s.state;
                const isClosed = state !== "open";
                return (
                    <div key={s.id} className={`px-3 py-3 mb-2 rounded-lg border ${SEVERITY_STYLE[s.severity]} ${isClosed ? "opacity-60" : ""}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[s.severity]}`} />
                            <span className="text-[10px] font-semibold uppercase tracking-wide">{s.severity}</span>
                            <span className="text-[10px] text-gray-500 ml-auto truncate">{s.section}</span>
                        </div>
                        <div className="font-medium text-sm text-gray-900">{s.title}</div>
                        <div className="text-xs text-gray-600 mt-1">{s.rationale}</div>
                        <div className="text-xs text-gray-700 mt-2 italic">→ {s.proposed}</div>
                        {state === "open" ? (
                            <div className="flex gap-1 mt-3">
                                <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => onAccept(s.id)}>Accept</Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReject(s.id)}>Reject</Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] font-medium">{state === "accepted" ? "✓ accepted" : "✕ rejected"}</span>
                                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => onReopen(s.id)}>Re-open</Button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function VersionsTab() {
    return (
        <div className="p-3">
            {DOC_VERSIONS.map(v => (
                <div key={v.id} className="px-3 py-3 mb-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{v.label}</span>
                        <span className="text-[10px] text-gray-500">{v.when}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{v.author} · {v.summary}</div>
                </div>
            ))}
            <div className="mt-3 text-[10px] text-gray-500">Click a version to view, restore, or compare.</div>
        </div>
    );
}

function OutlineTab() {
    return (
        <div className="p-3">
            <ul className="text-sm space-y-1">
                {DOC_BLOCKS.filter(b => b.heading).map(b => (
                    <li key={b.id} className="px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">{b.heading}</li>
                ))}
            </ul>
        </div>
    );
}

function CommentsTab() {
    return (
        <div className="p-3">
            {DOC_COMMENTS.map((c, i) => (
                <div key={i} className="px-3 py-3 mb-2 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{c.author} <span className="text-gray-500 font-normal">{c.role}</span></span>
                        <span className="text-[10px] text-gray-500">{c.when}</span>
                    </div>
                    <div className="text-xs text-gray-700 mt-1">{c.text}</div>
                </div>
            ))}
        </div>
    );
}
