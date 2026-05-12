"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Network, Bot, User, Shield, FileText, MessageSquare, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

// SCAFFOLD: ported design from haqq-prototype.pages.dev `Drafting Board`.
// This is the visual shell + interaction skeleton; backend wiring (agent reasoning,
// tool calls, gate approvals) is intentionally stubbed for next-session implementation.
// See haqq-prototype `BOARD_NODES`, `BOARD_LINKS`, `BOARD_TIMELINE` for the full
// data model the prototype demonstrates.

type NodeKind = "contract" | "termsheet" | "redline" | "client" | "memo" | "precedent";
type ActorKind = "agent" | "human" | "gate";

interface BoardNode {
    id: string;
    kind: NodeKind;
    title: string;
    subtitle: string;
    x: number;
    y: number;
    actor: ActorKind;
}

const NODES: BoardNode[] = [
    { id: "n1", kind: "client",    title: "Client brief",        subtitle: "Acme x Globex M&A — discovery call notes", x: 80,  y: 60,  actor: "human" },
    { id: "n2", kind: "termsheet", title: "Term sheet draft v0", subtitle: "Agent · 2 min · Anthropic Opus",          x: 380, y: 60,  actor: "agent" },
    { id: "n3", kind: "precedent", title: "Precedent search",    subtitle: "Agent · pulled 4 similar deals",          x: 80,  y: 260, actor: "agent" },
    { id: "n4", kind: "redline",   title: "Counter-redline",     subtitle: "Agent · 12 changes proposed",             x: 380, y: 260, actor: "agent" },
    { id: "n5", kind: "memo",      title: "Risk memo",           subtitle: "Agent · awaiting partner approval",       x: 680, y: 160, actor: "gate" },
    { id: "n6", kind: "contract",  title: "Final SPA",           subtitle: "Pending gate · associate review",         x: 680, y: 360, actor: "gate" },
];

const LINKS: [string, string][] = [
    ["n1", "n2"],
    ["n1", "n3"],
    ["n2", "n4"],
    ["n3", "n4"],
    ["n4", "n5"],
    ["n4", "n6"],
];

const NODE_ICONS: Record<NodeKind, React.ComponentType<{ className?: string }>> = {
    contract: FileText,
    termsheet: FileText,
    redline: FileText,
    client: MessageSquare,
    memo: FileText,
    precedent: FileText,
};

const ACTOR_ICONS: Record<ActorKind, React.ComponentType<{ className?: string }>> = {
    agent: Bot,
    human: User,
    gate: Shield,
};

const ACTOR_COLORS: Record<ActorKind, string> = {
    agent: "bg-purple-50 border-purple-300 text-purple-900",
    human: "bg-blue-50 border-blue-300 text-blue-900",
    gate:  "bg-amber-50 border-amber-300 text-amber-900",
};

const TIMELINE = [
    { t: "09:12", actor: "human" as ActorKind, text: "Client brief uploaded." },
    { t: "09:13", actor: "agent" as ActorKind, text: "Agent generated term sheet v0 (Anthropic Opus)." },
    { t: "09:14", actor: "agent" as ActorKind, text: "Precedent search returned 4 matches from firm KB." },
    { t: "09:21", actor: "agent" as ActorKind, text: "Counter-redline drafted, 12 changes." },
    { t: "09:22", actor: "gate" as ActorKind,  text: "Risk memo flagged — awaiting partner approval." },
    { t: "09:23", actor: "gate" as ActorKind,  text: "Final SPA paused at gate." },
];

export default function DraftingBoardPage() {
    return (
        <Suspense fallback={<div className="p-12 text-sm text-gray-500">loading board…</div>}>
            <DraftingBoardInner />
        </Suspense>
    );
}

interface IncomingSuggestion {
    id: string;
    title: string;
    severity: "high" | "medium" | "low";
    section: string;
}

function DraftingBoardInner() {
    const params = useSearchParams();
    const router = useRouter();
    const docId = params.get("docId");
    const sugIds = params.get("suggestions");

    const [filter, setFilter] = useState<"all" | ActorKind>("all");
    const [selected, setSelected] = useState<string | null>(null);
    const [incomingSuggestions, setIncomingSuggestions] = useState<IncomingSuggestion[]>([]);

    // If we arrived from /doc-workspace with ?suggestions=ids, hydrate them as
    // pending board nodes (drawn under the timeline as "incoming from doc").
    useEffect(() => {
        if (!docId || !sugIds) { setIncomingSuggestions([]); return; }
        (async () => {
            try {
                const headers = await authHeaders();
                const r = await fetch(`${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/suggestions`, { headers });
                if (!r.ok) return;
                const json = await r.json();
                const allowed = new Set(sugIds.split(",").filter(Boolean));
                const filtered: IncomingSuggestion[] = (json.suggestions ?? []).filter((s: { id: string; state: string }) => allowed.has(s.id) && s.state === "open");
                setIncomingSuggestions(filtered);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [docId, sugIds]);

    const selectedNode = selected ? NODES.find(n => n.id === selected) : null;
    const filteredTimeline = TIMELINE.filter(e => filter === "all" || e.actor === filter);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Canvas */}
            <div className="flex-1 relative overflow-auto bg-gray-50">
                <div className="absolute inset-0 [background-image:radial-gradient(#0001_1px,transparent_1px)] [background-size:24px_24px]" />
                <div className="relative" style={{ width: 1100, height: 600 }}>
                    {/* Links */}
                    <svg className="absolute inset-0 pointer-events-none" width={1100} height={600}>
                        {LINKS.map(([from, to], i) => {
                            const a = NODES.find(n => n.id === from)!;
                            const b = NODES.find(n => n.id === to)!;
                            return (
                                <line
                                    key={i}
                                    x1={a.x + 120} y1={a.y + 40}
                                    x2={b.x} y2={b.y + 40}
                                    stroke="#94a3b8"
                                    strokeWidth={1.5}
                                    strokeDasharray="4 4"
                                />
                            );
                        })}
                    </svg>
                    {/* Nodes */}
                    {NODES.map(n => {
                        const Icon = NODE_ICONS[n.kind];
                        const ActorIcon = ACTOR_ICONS[n.actor];
                        return (
                            <button
                                key={n.id}
                                onClick={() => setSelected(n.id)}
                                className={`absolute w-60 rounded-lg border-2 ${ACTOR_COLORS[n.actor]} p-3 text-left shadow-sm hover:shadow-md transition-shadow ${selected === n.id ? "ring-2 ring-offset-2 ring-gray-900" : ""}`}
                                style={{ left: n.x, top: n.y }}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Icon className="w-4 h-4" />
                                    <span className="font-medium text-sm truncate flex-1">{n.title}</span>
                                    <ActorIcon className="w-3.5 h-3.5 opacity-70" />
                                </div>
                                <div className="text-xs opacity-70 truncate">{n.subtitle}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right rail: timeline + detail */}
            <div className="w-[420px] flex-shrink-0 border-l border-gray-200 flex flex-col">
                <div className="px-5 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Network className="w-5 h-5" />
                        <h1 className="text-lg font-semibold">Drafting Board</h1>
                        {docId && <Badge variant="secondary" className="text-[10px] font-mono">doc: {docId}</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Visual workspace for agentic legal workflows. Each node is a deliverable; gates pause for human approval.
                    </p>
                    {docId && (
                        <Button size="sm" variant="outline" className="mb-3 h-7 text-xs" onClick={() => router.push(`/doc-workspace?docId=${encodeURIComponent(docId)}`)}>
                            <ExternalLink className="w-3 h-3 mr-1" /> Back to doc workspace
                        </Button>
                    )}
                    <div className="flex gap-1.5">
                        {(["all", "agent", "human", "gate"] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2.5 py-1 text-xs rounded-full border ${filter === f ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {selectedNode ? (
                    <div className="px-5 py-4 border-b border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">{selectedNode.actor.toUpperCase()}</div>
                        <h2 className="font-semibold text-gray-900 mb-1">{selectedNode.title}</h2>
                        <p className="text-sm text-gray-600 mb-3">{selectedNode.subtitle}</p>
                        <div className="flex gap-2">
                            {selectedNode.actor === "gate" && (
                                <Button size="sm" variant="default">Approve</Button>
                            )}
                            <Button size="sm" variant="outline">Open</Button>
                            <Button size="sm" variant="ghost">Re-run</Button>
                        </div>
                    </div>
                ) : null}

                <div className="flex-1 overflow-y-auto">
                    {incomingSuggestions.length > 0 && (
                        <>
                            <div className="px-5 py-3 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Incoming from Doc · {incomingSuggestions.length}
                            </div>
                            {incomingSuggestions.map(s => {
                                const sevColor = s.severity === "high" ? "bg-red-500" : s.severity === "medium" ? "bg-yellow-500" : "bg-blue-400";
                                return (
                                    <div key={s.id} className="px-5 py-3 border-b border-gray-100 flex items-start gap-3 hover:bg-gray-50">
                                        <span className={`w-2 h-2 rounded-full mt-1.5 ${sevColor}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 truncate">{s.title}</div>
                                            <div className="text-xs text-gray-500 truncate">{s.section}</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                );
                            })}
                        </>
                    )}
                    <div className="px-5 py-3 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">Timeline</div>
                    {filteredTimeline.map((e, i) => {
                        const ActorIcon = ACTOR_ICONS[e.actor];
                        return (
                            <div key={i} className="px-5 py-3 border-b border-gray-100 flex items-start gap-3">
                                <ActorIcon className="w-4 h-4 mt-0.5 text-gray-500" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500">{e.t}</div>
                                    <div className="text-sm text-gray-800">{e.text}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="px-5 py-3 border-t border-gray-200 bg-amber-50 flex items-center gap-2">
                    <Badge variant="secondary" className="bg-amber-200 text-amber-900">1 approval pending</Badge>
                    <ChevronRight className="w-4 h-4 text-amber-700" />
                </div>
            </div>
        </div>
    );
}
