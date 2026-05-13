"use client";

import { useState, useMemo, useEffect, Suspense, lazy } from "react";
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
import { getAuthHeader as authHeaders } from "@/app/lib/louisApi";

// Lazy-load the rich-text editor so the doc-workspace shell stays light. The
// editor pulls in TipTap + ProseMirror, which we only need on the edit view.
const RichTextEditor = lazy(() =>
    import("@/app/components/editor").then((m) => ({ default: m.RichTextEditor })),
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

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

interface ServerVersion {
    id: string;
    versionNumber: number | null;
    displayName: string;
    source: string;
    createdAt: string;
    summary: string | null;
}

interface ServerComment {
    id: string;
    author: string;
    role: string;
    text: string;
    createdAt: string;
}

interface ServerBlock {
    id: string;
    heading?: string;
    text?: string;
    changed?: boolean;
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
    text?: string;
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
        <Suspense fallback={<div className="p-12 text-sm text-muted-foreground">loading workspace…</div>}>
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
    const [tone, setToneState] = useState(50);

    // Persist tone via /api/customize using key doc.tone (debounced)
    useEffect(() => {
        const timer = setTimeout(async () => {
            const headers = await authHeaders();
            if (!headers.Authorization) return;
            await fetch(`${API_BASE}/api/customize/doc.tone`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                // /api/customize stores booleans by design, so we encode tone into the key suffix
                body: JSON.stringify({ enabled: tone >= 50 }),
            }).catch(() => {});
        }, 600);
        return () => clearTimeout(timer);
    }, [tone]);

    function setTone(v: number) { setToneState(v); }
    const [accOpen, setAccOpen] = useState({
        risk: true,
        parties: true,
        defs: false,
        cites: false,
        juris: true,
    });

    const [meta, setMeta] = useState<DocMetadata | null>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [versions, setVersions] = useState<ServerVersion[]>([]);
    const [comments, setComments] = useState<ServerComment[]>([]);
    const [contentBlocks, setContentBlocks] = useState<ServerBlock[]>([]);
    // Rich-text editor uses HTML as the authoritative wire format; blocks
    // remain available for the read/compare views. The version counter
    // drives optimistic concurrency against `PUT /content`.
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [htmlContentVersion, setHtmlContentVersion] = useState<number>(1);
    const [editorSaveBanner, setEditorSaveBanner] = useState<
        | { kind: "saved"; at: string }
        | { kind: "offline" }
        | { kind: "conflict"; currentVersion: number }
        | null
    >(null);
    const [compareBlocks, setCompareBlocks] = useState<ServerBlock[]>([]);
    const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    async function loadCompareVersion(versionId: string) {
        const headers = await authHeaders();
        const r = await fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/content?versionId=${encodeURIComponent(versionId)}`, { headers, cache: "no-store" });
        if (r.ok) {
            const json = await r.json();
            setCompareBlocks(json.blocks ?? []);
            setCompareVersionId(versionId);
        }
    }

    // Load all the things in parallel
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const headers = await authHeaders();
                const [mr, sr, vr, cr, br] = await Promise.all([
                    fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/metadata`,    { headers, cache: "no-store" }),
                    fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/suggestions`, { headers, cache: "no-store" }),
                    fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/versions`,    { headers, cache: "no-store" }),
                    fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/comments`,    { headers, cache: "no-store" }),
                    fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/content`,     { headers, cache: "no-store" }),
                ]);
                if (cancelled) return;
                if (mr.ok) setMeta(await mr.json()); else setLoadError(`metadata: HTTP ${mr.status}`);
                if (sr.ok) setSuggestions((await sr.json()).suggestions ?? []);
                if (vr.ok) setVersions((await vr.json()).versions ?? []);
                if (cr.ok) setComments((await cr.json()).comments ?? []);
                if (br.ok) {
                    const body = await br.json();
                    setContentBlocks(body.blocks ?? []);
                    if (typeof body.htmlContent === "string") setHtmlContent(body.htmlContent);
                    if (typeof body.htmlContentVersion === "number") setHtmlContentVersion(body.htmlContentVersion);
                }
            } catch (e) {
                if (!cancelled) setLoadError((e as Error).message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [docId]);

    async function postComment(text: string) {
        const headers = await authHeaders();
        const r = await fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/comments`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        if (r.ok) {
            const json = await r.json();
            setComments(prev => [json.comment, ...prev]);
        }
    }

    async function deleteComment(commentId: string) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        const headers = await authHeaders();
        await fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/comments/${encodeURIComponent(commentId)}`, {
            method: "DELETE",
            headers,
        });
    }

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

    // Demo mode = the marketing tour preview path. Only here do we fall back
    // to the DOC_* fixtures when state is empty. For real docs, missing data
    // renders as empty-state copy / "—" so users never see Acme x Globex.
    const isDemo = docId === "demo";

    // Use real content if loaded; otherwise fall back to the fixture (demo only).
    const blocksForRender = contentBlocks.length
        ? contentBlocks
        : (isDemo ? DOC_BLOCKS : []);
    const visibleBlocks = useMemo(() => {
        if (view === "compare") {
            // Only show blocks where current differs from compare baseline
            if (compareBlocks.length) {
                const baselineMap = new Map(compareBlocks.map(b => [b.heading ?? b.id, b]));
                return blocksForRender.filter(b => {
                    const baseline = baselineMap.get(b.heading ?? b.id);
                    return !baseline || (baseline.text ?? "") !== (b.text ?? "");
                });
            }
            return blocksForRender.filter(b => b.changed);
        }
        return blocksForRender;
    }, [view, blocksForRender, compareBlocks]);

    const compareBaseline = useMemo(() => {
        return new Map(compareBlocks.map(b => [b.heading ?? b.id, b]));
    }, [compareBlocks]);

    // Title fallback chain:
    //   demo → fixture title;
    //   real doc → backend title, else filename, else "(untitled document)"
    const title = isDemo
        ? (meta?.title || DOC_DEFAULT.title)
        : (meta?.title || meta?.filename || (loading ? "Loading…" : "(untitled document)"));
    const wordCount = meta?.wordCount ?? (isDemo ? DOC_DEFAULT.wordCount : null);
    const readingMin = meta?.readingMin ?? (isDemo ? DOC_DEFAULT.readingMin : null);
    const hasParties = !!(meta?.parties && meta.parties.length);
    const hasDefs = !!(meta?.definitions && meta.definitions.length);
    const hasCites = !!(meta?.citations && meta.citations.length);
    const partiesData = hasParties ? meta!.parties : (isDemo ? DOC_PARTIES : []);
    const defsData = hasDefs ? meta!.definitions : (isDemo ? DOC_DEFS : []);
    const citesData = hasCites ? meta!.citations : (isDemo ? DOC_CITES : []);
    const jurisdictionLabel = meta?.jurisdiction
        ? `${meta.jurisdiction.primary}${meta.jurisdiction.secondary?.length ? " / " + meta.jurisdiction.secondary.join(", ") : ""}`
        : (isDemo ? "UAE / DIFC" : "—");
    const hasJurisdiction = !!meta?.jurisdiction;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Top bar */}
            <div className="border-b border-border px-5 py-3 flex items-center gap-4 flex-shrink-0">
                <FileText className="w-5 h-5 text-foreground/80" />
                <div className="flex-1">
                    <div className="font-semibold text-sm flex items-center gap-2">
                        {title}
                        {meta?.source === "fixture" && <Badge variant="secondary" className="text-[10px]">demo</Badge>}
                        {meta?.source === "live" && <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">live</Badge>}
                        {loadError && <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">{loadError}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                        {isDemo && <span className="flex items-center gap-1"><Save className="w-3 h-3" /> saved {DOC_DEFAULT.savedAt}</span>}
                        {wordCount != null && <span>{wordCount} words</span>}
                        {readingMin != null && <span>{readingMin} min read</span>}
                        <span className="font-mono opacity-50">docId: {docId}</span>
                    </div>
                </div>

                {/* View mode toggle */}
                <div className="flex items-center bg-muted rounded-md p-0.5">
                    {(["edit", "review", "read", "compare"] as const).map(v => {
                        const Icon = v === "edit" ? Edit3 : v === "review" ? ListChecks : v === "read" ? Glasses : GitCompare;
                        return (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded ${view === v ? "bg-card shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {v}
                            </button>
                        );
                    })}
                </div>

                {/* Tone slider */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12 text-right">tone</span>
                    <input
                        type="range"
                        min={0} max={100} step={1}
                        value={tone}
                        onChange={e => setTone(parseInt(e.target.value))}
                        className="w-20 accent-foreground"
                    />
                    <span className="text-xs font-medium text-foreground/80 w-14">{toneLabel}</span>
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
                <div className={`border-r border-border flex flex-col flex-shrink-0 transition-all ${leftCollapsed ? "w-12" : "w-[340px]"}`}>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                        {!leftCollapsed && (
                            <div className="flex gap-1">
                                <DocTabBtn icon={MessageSquare}  label="Chat"        active={tab === "chat"}        onClick={() => setTab("chat")} />
                                <DocTabBtn icon={ListChecks}     label="Suggestions" active={tab === "suggestions"} onClick={() => setTab("suggestions")} badge={suggestions.length} />
                                <DocTabBtn icon={History}        label="Versions"    active={tab === "versions"}    onClick={() => setTab("versions")} />
                                <DocTabBtn icon={ListOrdered}    label="Outline"     active={tab === "outline"}     onClick={() => setTab("outline")} />
                                <DocTabBtn icon={MessageCircle}  label="Comments"    active={tab === "comments"}    onClick={() => setTab("comments")} badge={comments.length} />
                            </div>
                        )}
                        <button onClick={() => setLeftCollapsed(c => !c)} className="text-muted-foreground hover:text-foreground ml-auto">
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
                            {tab === "versions" && <VersionsTab versions={versions} />}
                            {tab === "outline" && <OutlineTab blocks={blocksForRender} />}
                            {tab === "comments" && <CommentsTab comments={comments} onPost={postComment} onDelete={deleteComment} />}
                        </div>
                    )}
                </div>

                {/* Center: document — rich-text editor (edit) or block view (review/read/compare). */}
                <div className="flex-1 overflow-hidden bg-muted relative">
                    {view === "edit" ? (
                        <Suspense fallback={<div className="p-12 text-sm text-muted-foreground">loading editor…</div>}>
                            {editorSaveBanner && (
                                <div className={`absolute top-2 right-2 z-10 px-3 py-1.5 text-xs rounded-md shadow-sm border ${
                                    editorSaveBanner.kind === "offline" ? "bg-amber-50 border-amber-200 text-amber-900" :
                                    editorSaveBanner.kind === "conflict" ? "bg-red-50 border-red-200 text-red-900" :
                                    "bg-emerald-50 border-emerald-200 text-emerald-900"
                                }`}>
                                    {editorSaveBanner.kind === "offline" && "Offline — changes saved locally"}
                                    {editorSaveBanner.kind === "conflict" && `Another tab saved newer content (v${editorSaveBanner.currentVersion}). Reload to continue.`}
                                    {editorSaveBanner.kind === "saved" && `Saved · ${new Date(editorSaveBanner.at).toLocaleTimeString()}`}
                                </div>
                            )}
                            <RichTextEditor
                                docId={docId}
                                title={title}
                                authorName="You"
                                initialBlocks={blocksForRender as ServerBlock[]}
                                initialHtml={htmlContent ?? undefined}
                                initialHtmlVersion={htmlContentVersion}
                                railOpen={true}
                                onRemoteSave={async (html, version) => {
                                    try {
                                        const headers = await authHeaders();
                                        const r = await fetch(
                                            `${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/content`,
                                            {
                                                method: "PUT",
                                                headers: { ...headers, "Content-Type": "application/json" },
                                                body: JSON.stringify({ html, version }),
                                            },
                                        );
                                        if (r.status === 409) {
                                            const body = await r.json().catch(() => ({}));
                                            const currentVersion = Number(body?.currentVersion ?? version);
                                            setEditorSaveBanner({ kind: "conflict", currentVersion });
                                            return { ok: false as const, conflict: true as const, currentVersion };
                                        }
                                        if (!r.ok) {
                                            return { ok: false as const, network: true as const, message: `HTTP ${r.status}` };
                                        }
                                        const body = await r.json();
                                        setHtmlContentVersion(body.version);
                                        setEditorSaveBanner({ kind: "saved", at: body.savedAt });
                                        setTimeout(() => setEditorSaveBanner((b) => b?.kind === "saved" ? null : b), 2500);
                                        return { ok: true as const, version: body.version, savedAt: body.savedAt };
                                    } catch (e) {
                                        setEditorSaveBanner({ kind: "offline" });
                                        return { ok: false as const, network: true as const, message: (e as Error).message };
                                    }
                                }}
                                onPersist={(blocks, html) => {
                                    setContentBlocks(blocks);
                                    if (typeof html === "string") setHtmlContent(html);
                                }}
                            />
                        </Suspense>
                    ) : (
                        <div className="h-full overflow-y-auto">
                            <div className="max-w-3xl mx-auto px-8 py-10">
                                {view === "compare" && (
                                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center gap-2">
                                        <GitCompare className="w-3.5 h-3.5" />
                                        <span className="flex-1">
                                            {compareBlocks.length ? (
                                                <>Showing only sections changed vs <strong>{compareVersionId}</strong>.</>
                                            ) : (
                                                <>Pick a version to compare against:</>
                                            )}
                                        </span>
                                        {versions.length > 1 && (
                                            <select
                                                value={compareVersionId ?? ""}
                                                onChange={e => e.target.value && loadCompareVersion(e.target.value)}
                                                className="text-xs border border-amber-300 rounded px-2 py-0.5 bg-card"
                                            >
                                                <option value="">— pick a version —</option>
                                                {versions.slice(1).map(v => (
                                                    <option key={v.id} value={v.id}>{v.displayName}</option>
                                                ))}
                                            </select>
                                        )}
                                        <button className="underline" onClick={() => setView("edit")}>back to edit</button>
                                    </div>
                                )}
                                <div className="bg-card border border-border rounded-lg p-10 shadow-sm">
                                    {visibleBlocks.length ? (
                                        visibleBlocks.map(b => (
                                            <DocBlockView key={b.id} block={b} view={view} />
                                        ))
                                    ) : (
                                        <div className="text-sm text-muted-foreground text-center py-8">
                                            {view === "compare" ? "No differences to show." : "Document is empty."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right rail */}
                {rightOpen && (
                    <div className="w-[300px] border-l border-border flex-shrink-0 overflow-y-auto">
                        <Accordion title="Risk" icon={AlertTriangle} count={`${suggestions.filter(s => s.severity === "high" && s.state === "open").length} high · open`} open={accOpen.risk} onToggle={() => setAccOpen(s => ({...s, risk: !s.risk}))}>
                            <ul className="space-y-2">
                                {suggestions.map(s => (
                                    <li key={s.id} className={`text-xs ${s.state !== "open" ? "opacity-50" : ""}`}>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[s.severity]}`} />
                                            <span className="font-medium text-foreground truncate">{s.title}</span>
                                        </div>
                                        <div className="text-muted-foreground ml-3 truncate">{s.section}</div>
                                    </li>
                                ))}
                                {!suggestions.length && <li className="text-xs text-muted-foreground">no suggestions</li>}
                            </ul>
                        </Accordion>

                        <Accordion title="Parties" icon={Users} count={partiesData.length ? `${partiesData.length}` : "—"} open={accOpen.parties} onToggle={() => setAccOpen(s => ({...s, parties: !s.parties}))}>
                            {partiesData.length ? (
                                <ul className="space-y-2">
                                    {partiesData.map((p, i) => (
                                        <li key={i} className="text-xs">
                                            <div className="font-medium text-foreground">{p.name}</div>
                                            <div className="text-muted-foreground">{p.role} · {p.details}</div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    <div className="mb-1.5">No parties recorded yet.</div>
                                    {/* TODO: wire to a real "add party" endpoint once the backend exposes one. */}
                                    <button
                                        type="button"
                                        onClick={() => { /* no-op until backend supports parties CRUD */ }}
                                        className="text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                                        disabled
                                        title="Coming soon — backend endpoint not available"
                                    >
                                        + Add party
                                    </button>
                                </div>
                            )}
                        </Accordion>

                        <Accordion title="Definitions" icon={BookText} count={defsData.length ? `${defsData.length}` : "—"} open={accOpen.defs} onToggle={() => setAccOpen(s => ({...s, defs: !s.defs}))}>
                            {defsData.length ? (
                                <ul className="text-xs space-y-1 text-foreground/80">
                                    {defsData.map((d, i) => <li key={i}>· {d}</li>)}
                                </ul>
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    <div className="mb-1.5">No defined terms extracted.</div>
                                    <button
                                        type="button"
                                        onClick={() => router.push("/assistant?prefill=Extract+defined+terms")}
                                        className="text-foreground underline underline-offset-2 hover:opacity-80"
                                    >
                                        Run /extract-defs to populate
                                    </button>
                                </div>
                            )}
                        </Accordion>

                        <Accordion title="Citations" icon={Quote} count={citesData.length ? `${citesData.length}` : "—"} open={accOpen.cites} onToggle={() => setAccOpen(s => ({...s, cites: !s.cites}))}>
                            {citesData.length ? (
                                <ul className="space-y-2">
                                    {citesData.map((c, i) => (
                                        <li key={i} className="text-xs">
                                            <div className="font-mono text-foreground">{c.ref}</div>
                                            <div className="text-muted-foreground">{c.note}</div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    <div className="mb-1.5">No citations found.</div>
                                    <button
                                        type="button"
                                        onClick={() => router.push("/assistant?prefill=Extract+citations")}
                                        className="text-foreground underline underline-offset-2 hover:opacity-80"
                                    >
                                        Run /extract-citations to populate
                                    </button>
                                </div>
                            )}
                        </Accordion>

                        <Accordion title="Jurisdiction" icon={Scale} count={jurisdictionLabel} open={accOpen.juris} onToggle={() => setAccOpen(s => ({...s, juris: !s.juris}))}>
                            {hasJurisdiction || isDemo ? (
                                <div className="text-xs space-y-1.5 text-foreground/80">
                                    <div><span className="text-muted-foreground">Governing law:</span> {jurisdictionLabel}</div>
                                    <div><span className="text-muted-foreground">Seat of arbitration:</span> {isDemo ? "DIAC, DIFC" : "—"}</div>
                                    <div><span className="text-muted-foreground">Language:</span> {isDemo ? "English controls" : "—"}</div>
                                    <div><span className="text-muted-foreground">Notarization:</span> {isDemo ? "Not required for this document type" : "—"}</div>
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground">No jurisdiction detected yet.</div>
                            )}
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
        <button onClick={onClick} className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${active ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badge != null && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{badge}</Badge>}
        </button>
    );
}

function Accordion({ title, icon: Icon, count, open, onToggle, children }: { title: string; icon: React.ComponentType<{ className?: string }>; count?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
    return (
        <div className="border-b border-border">
            <button onClick={onToggle} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-muted">
                {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                <Icon className="w-4 h-4 text-foreground/80" />
                <span className="text-sm font-medium text-foreground flex-1 text-left">{title}</span>
                {count && <span className="text-xs text-muted-foreground">{count}</span>}
            </button>
            {open && <div className="px-4 pb-3">{children}</div>}
        </div>
    );
}

function DocBlockView({ block, view }: { block: DocBlock; view: DocView }) {
    if (view === "review") {
        return (
            <div className={`mb-6 -mx-4 px-4 py-2 rounded ${block.changed ? "bg-yellow-50 ring-1 ring-yellow-200" : ""}`}>
                {block.heading && <h2 className="font-semibold text-foreground mb-2">{block.heading}</h2>}
                <p className="text-sm text-foreground leading-relaxed">{block.text}</p>
                {block.changed && <div className="mt-2 text-xs text-yellow-700">⚠️ this section has open suggestions</div>}
            </div>
        );
    }
    if (view === "read") {
        return (
            <div className="mb-6">
                {block.heading && <h2 className="text-xl font-serif text-foreground mb-3">{block.heading}</h2>}
                <p className="text-base font-serif text-foreground leading-loose">{block.text}</p>
            </div>
        );
    }
    return (
        <div className="mb-6">
            {block.heading && <h2 className="font-semibold text-foreground mb-2">{block.heading}</h2>}
            <p className="text-sm text-foreground leading-relaxed">{block.text}</p>
        </div>
    );
}

function ChatTab({ docId }: { docId: string }) {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
    const [sending, setSending] = useState(false);

    const examples = [
        "Tighten Section 4 IP language for Provider-favourable position",
        "What's the typical liability cap for this contract type in DIFC?",
        "Generate a counter-proposal email summarizing my asks",
    ];

    async function send(text: string) {
        if (!text.trim() || sending) return;
        setMessages(m => [...m, { role: "user", content: text }]);
        setInput("");
        setSending(true);
        try {
            const headers = await authHeaders();
            const r = await fetch(`${API_BASE}/chat/stream`, {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "user", content: `[About document ${docId}]\n\n${text}` },
                    ],
                }),
            });
            if (!r.ok || !r.body) {
                setMessages(m => [...m, { role: "assistant", content: `Error: HTTP ${r.status}` }]);
                return;
            }
            // Stream parsing (SSE-style "data: {json}\n\n")
            const reader = r.body.getReader();
            const dec = new TextDecoder();
            let buffer = "";
            let assistantText = "";
            setMessages(m => [...m, { role: "assistant", content: "" }]);
            const updateLast = (delta: string) => {
                assistantText += delta;
                setMessages(m => {
                    const copy = [...m];
                    copy[copy.length - 1] = { role: "assistant", content: assistantText };
                    return copy;
                });
            };
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += dec.decode(value, { stream: true });
                let idx;
                while ((idx = buffer.indexOf("\n\n")) >= 0) {
                    const ev = buffer.slice(0, idx).trim();
                    buffer = buffer.slice(idx + 2);
                    if (!ev.startsWith("data:")) continue;
                    try {
                        const payload = JSON.parse(ev.slice(5).trim());
                        if (payload.type === "text_delta" && payload.text) updateLast(payload.text);
                        else if (payload.type === "text" && payload.text) updateLast(payload.text);
                    } catch { /* non-JSON keepalive */ }
                }
            }
        } catch (e) {
            setMessages(m => [...m, { role: "assistant", content: `Error: ${(e as Error).message}` }]);
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="p-3 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto mb-3 space-y-2">
                {messages.length === 0 && (
                    <div className="text-xs text-muted-foreground">
                        <div className="mb-2 text-foreground font-medium text-sm">In-doc chat</div>
                        <p className="mb-2">Ask Louis about this document:</p>
                        <ul className="space-y-1.5">
                            {examples.map((ex, i) => (
                                <li key={i} onClick={() => send(ex)} className="px-2 py-1.5 bg-muted rounded cursor-pointer hover:bg-muted">
                                    &ldquo;{ex}&rdquo;
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`px-3 py-2 rounded-lg text-xs ${m.role === "user" ? "bg-blue-50 text-blue-900 ml-6" : "bg-muted text-foreground mr-6"}`}>
                        <div className="text-[10px] text-muted-foreground uppercase mb-0.5">{m.role}</div>
                        <div className="whitespace-pre-wrap">{m.content || <span className="opacity-50">…</span>}</div>
                    </div>
                ))}
            </div>
            <div className="border-t border-border pt-2">
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(input); }}
                    rows={2}
                    placeholder="Ask about this doc… (⌘↩ to send)"
                    className="w-full text-xs border border-border rounded p-2 resize-none"
                    disabled={sending}
                />
                <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-muted-foreground">routed via skills system</span>
                    <Button size="sm" onClick={() => send(input)} disabled={sending || !input.trim()} className="h-7 text-xs">
                        {sending ? "sending…" : "Send"}
                    </Button>
                </div>
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
        return <div className="p-4 text-xs text-muted-foreground">loading suggestions…</div>;
    }
    if (!suggestions.length) {
        return <div className="p-4 text-xs text-muted-foreground">no suggestions for this document yet</div>;
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
                            <span className="text-[10px] text-muted-foreground ml-auto truncate">{s.section}</span>
                        </div>
                        <div className="font-medium text-sm text-foreground">{s.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">{s.rationale}</div>
                        <div className="text-xs text-foreground/80 mt-2 italic">→ {s.proposed}</div>
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

function VersionsTab({ versions }: { versions: ServerVersion[] }) {
    if (!versions.length) {
        return <div className="p-3 text-xs text-muted-foreground">Only the current version</div>;
    }
    const labelFor = (s: string) =>
        s === "user_upload" ? "user upload" :
        s === "assistant_edit" ? "AI edits" :
        s === "user_accept" ? "user accept" :
        s === "user_reject" ? "user reject" :
        s === "generated" ? "generated" :
        s;
    return (
        <div className="p-3">
            {versions.map((v, idx) => (
                <div key={v.id} className="px-3 py-3 mb-2 rounded-lg border border-border hover:bg-muted cursor-pointer">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{v.displayName}{idx === 0 ? " (current)" : ""}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        <span className="font-mono text-[10px] bg-muted px-1 rounded">{labelFor(v.source)}</span>
                        {v.summary && <> · {v.summary}</>}
                    </div>
                </div>
            ))}
            <div className="mt-3 text-[10px] text-muted-foreground">Click a version to view, restore, or compare.</div>
        </div>
    );
}

function OutlineTab({ blocks }: { blocks: ServerBlock[] }) {
    const headings = blocks.filter(b => b.heading);
    if (!headings.length) return <div className="p-3 text-xs text-muted-foreground">no headings detected in this doc</div>;
    return (
        <div className="p-3">
            <ul className="text-sm space-y-1">
                {headings.map(b => (
                    <li key={b.id} className="px-2 py-1 rounded hover:bg-muted cursor-pointer">{b.heading}</li>
                ))}
            </ul>
        </div>
    );
}

function CommentsTab({ comments, onPost, onDelete }: {
    comments: ServerComment[];
    onPost: (text: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const [text, setText] = useState("");
    const [posting, setPosting] = useState(false);
    async function submit() {
        if (!text.trim() || posting) return;
        setPosting(true);
        try { await onPost(text); setText(""); } finally { setPosting(false); }
    }
    return (
        <div className="p-3 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto mb-3">
                {!comments.length && <div className="text-xs text-muted-foreground">No comments yet — be the first to add one below.</div>}
                {comments.map(c => (
                    <div key={c.id} className="px-3 py-3 mb-2 rounded-lg border border-border group">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{c.author} <span className="text-muted-foreground font-normal">{c.role}</span></span>
                            <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-foreground/80 mt-1 whitespace-pre-wrap">{c.text}</div>
                        <button onClick={() => onDelete(c.id)} className="text-[10px] text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 mt-1">delete</button>
                    </div>
                ))}
            </div>
            <div className="border-t border-border pt-2">
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={2}
                    placeholder="Add a comment…"
                    className="w-full text-xs border border-border rounded p-2 resize-none"
                />
                <div className="flex justify-end mt-1">
                    <Button size="sm" onClick={submit} disabled={posting || !text.trim()} className="h-7 text-xs">
                        {posting ? "posting…" : "Post"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// TODOs — backend gaps surfaced while gating the DOC_* fixtures (2026-05-13)
// ---------------------------------------------------------------------------
// 1. Parties CRUD: the "+ Add party" affordance in the right rail is disabled
//    because there is no endpoint to persist a party. Add e.g.
//      POST   /api/doc-workspace/:docId/parties   { role, name, details }
//      DELETE /api/doc-workspace/:docId/parties/:partyId
//    and extend `DocMetadata.parties` (already there) so the optimistic update
//    is straightforward.
// 2. Extract slash-commands: `/extract-defs` and `/extract-citations` deep-link
//    to `/assistant?prefill=…` for now. If a first-class extraction endpoint
//    is exposed, replace those links with a button that calls it and merges
//    the results into `meta.definitions` / `meta.citations` without leaving
//    the workspace.
// 3. Demo-mode signal: we currently gate fixtures on `docId === "demo"`.
//    Long-term, the backend should return `source: "fixture" | "live"` (it
//    already does in DocMetadata) and we should trust that flag instead of
//    string-matching on docId.
