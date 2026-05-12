"use client";

/**
 * Drafting Board — visual workspace for agentic legal workflows.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ Top bar (board name + template + run-agent)                      │
 *   ├──────────────────┬───────────────────────────────────┬──────────┤
 *   │ Left rail        │ Canvas                            │ Right    │
 *   │  · Add palette   │  Nodes + links                    │ panel    │
 *   │  · Templates     │                                    │  · node │
 *   │  · Filters       │                                    │    detail│
 *   │                  │                                    │  · timeline
 *   │                  │                                    │  · gates │
 *   └──────────────────┴───────────────────────────────────┴──────────┘
 *
 * Each node has a status: idle | running | done | blocked | gate-pending.
 * Status drives color + chip; clicking a node opens the right-panel
 * detail with status-appropriate actions (Approve / Open / Re-run /
 * Delete). The "Run agent" button progresses nodes through statuses
 * over time, hits the live /api/skills/route-test for real skill IDs,
 * and emits real-time entries into the timeline.
 *
 * Templates (M&A, Employment, Due Diligence, Contract Review) load
 * preset node layouts so the user starts in the middle of a real-shaped
 * workflow instead of a blank canvas.
 */

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Network,
    Bot,
    User,
    Shield,
    FileText,
    MessageSquare,
    ChevronRight,
    ExternalLink,
    Plus,
    Trash2,
    PlayCircle,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    LayoutTemplate,
    Search as SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

async function authHeaders(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NodeKind =
    | "client"
    | "termsheet"
    | "precedent"
    | "redline"
    | "memo"
    | "contract"
    | "risk"
    | "research"
    | "gate";
type ActorKind = "agent" | "human" | "gate";
type NodeStatus =
    | "idle"
    | "running"
    | "done"
    | "blocked"
    | "needs_approval";

interface BoardNode {
    id: string;
    kind: NodeKind;
    title: string;
    subtitle: string;
    x: number;
    y: number;
    actor: ActorKind;
    status: NodeStatus;
    /** Skill IDs from the router for the last agent run on this node. */
    skillsUsed?: string[];
    /** Linked doc id, when this node is anchored to a /doc-workspace doc. */
    docId?: string;
}

type Link = [string, string];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

interface Template {
    id: string;
    label: string;
    description: string;
    nodes: BoardNode[];
    links: Link[];
}

const T_MA: Template = {
    id: "ma",
    label: "M&A — Acme × Globex",
    description: "Term sheet → diligence → redlines → SPA, with partner gate.",
    nodes: [
        { id: "ma-1", kind: "client",    title: "Client brief",        subtitle: "Acme × Globex M&A discovery call notes", x: 60,  y: 60,  actor: "human", status: "done" },
        { id: "ma-2", kind: "termsheet", title: "Term sheet draft v0", subtitle: "Agent · Anthropic Opus",                  x: 340, y: 60,  actor: "agent", status: "done" },
        { id: "ma-3", kind: "precedent", title: "Precedent search",    subtitle: "Agent · pulled 4 similar deals",          x: 60,  y: 240, actor: "agent", status: "done" },
        { id: "ma-4", kind: "redline",   title: "Counter-redline",     subtitle: "Agent · 12 changes proposed",             x: 340, y: 240, actor: "agent", status: "running" },
        { id: "ma-5", kind: "memo",      title: "Risk memo",           subtitle: "Awaiting partner approval",               x: 620, y: 150, actor: "gate",  status: "needs_approval" },
        { id: "ma-6", kind: "contract",  title: "Final SPA",           subtitle: "Pending gate · associate review",          x: 620, y: 340, actor: "gate",  status: "blocked" },
    ],
    links: [
        ["ma-1", "ma-2"], ["ma-1", "ma-3"], ["ma-2", "ma-4"],
        ["ma-3", "ma-4"], ["ma-4", "ma-5"], ["ma-4", "ma-6"],
    ],
};

const T_EMPLOYMENT: Template = {
    id: "employment",
    label: "Employment — offer + onboarding",
    description: "Offer letter, IP assignment, NDA, GDPR notice. UAE labor law.",
    nodes: [
        { id: "emp-1", kind: "client",    title: "New hire details",   subtitle: "VP Engineering · Dubai · senior",        x: 60,  y: 60,  actor: "human", status: "done" },
        { id: "emp-2", kind: "termsheet", title: "Offer letter",       subtitle: "Agent · UAE labor law",                  x: 340, y: 60,  actor: "agent", status: "running" },
        { id: "emp-3", kind: "contract",  title: "IP assignment",      subtitle: "Agent · with non-compete carve-out",     x: 340, y: 220, actor: "agent", status: "idle" },
        { id: "emp-4", kind: "contract",  title: "NDA (mutual)",       subtitle: "Agent · standard firm template",         x: 340, y: 360, actor: "agent", status: "idle" },
        { id: "emp-5", kind: "memo",      title: "GDPR data notice",   subtitle: "Agent · privacy schedule",               x: 620, y: 60,  actor: "agent", status: "idle" },
        { id: "emp-6", kind: "gate",      title: "Partner sign-off",   subtitle: "Final hire packet",                       x: 620, y: 280, actor: "gate",  status: "blocked" },
    ],
    links: [
        ["emp-1", "emp-2"], ["emp-1", "emp-3"], ["emp-1", "emp-4"],
        ["emp-2", "emp-5"], ["emp-3", "emp-6"], ["emp-4", "emp-6"],
        ["emp-5", "emp-6"],
    ],
};

const T_DUEDIL: Template = {
    id: "duedil",
    label: "Due diligence — vendor onboarding",
    description: "Sanctions screen, KYC, contract review, risk roll-up.",
    nodes: [
        { id: "dd-1", kind: "client",    title: "Vendor intake",      subtitle: "Counterparty · KYC packet uploaded",     x: 60,  y: 60,  actor: "human", status: "done" },
        { id: "dd-2", kind: "research",  title: "OFAC / sanctions",   subtitle: "Agent · 0 hits across 5 lists",          x: 340, y: 60,  actor: "agent", status: "done" },
        { id: "dd-3", kind: "research",  title: "Beneficial ownership", subtitle: "Agent · 4 UBOs surfaced",              x: 340, y: 200, actor: "agent", status: "done" },
        { id: "dd-4", kind: "redline",   title: "MSA review",         subtitle: "Agent · 8 risk findings",                 x: 340, y: 340, actor: "agent", status: "running" },
        { id: "dd-5", kind: "memo",      title: "Risk roll-up",       subtitle: "Awaiting GC review",                      x: 620, y: 200, actor: "gate",  status: "needs_approval" },
    ],
    links: [
        ["dd-1", "dd-2"], ["dd-1", "dd-3"], ["dd-1", "dd-4"],
        ["dd-2", "dd-5"], ["dd-3", "dd-5"], ["dd-4", "dd-5"],
    ],
};

const T_CONTRACT_REVIEW: Template = {
    id: "contract-review",
    label: "Contract review — single MSA",
    description: "Risk scan → clause-by-clause review → redline → memo.",
    nodes: [
        { id: "cr-1", kind: "client",  title: "Counter-MSA uploaded", subtitle: "Vendor template · 38 pages",        x: 60,  y: 60,  actor: "human", status: "done" },
        { id: "cr-2", kind: "risk",    title: "Risk scan",            subtitle: "Agent · 30 heuristics",             x: 340, y: 60,  actor: "agent", status: "done" },
        { id: "cr-3", kind: "redline", title: "Clause redlines",      subtitle: "Agent · 14 proposed edits",         x: 340, y: 220, actor: "agent", status: "done" },
        { id: "cr-4", kind: "memo",    title: "Client-facing memo",   subtitle: "Agent · BLUF + redline summary",    x: 620, y: 140, actor: "agent", status: "running" },
    ],
    links: [["cr-1", "cr-2"], ["cr-2", "cr-3"], ["cr-3", "cr-4"]],
};

const TEMPLATES: Template[] = [T_MA, T_EMPLOYMENT, T_DUEDIL, T_CONTRACT_REVIEW];

// ---------------------------------------------------------------------------
// Visuals
// ---------------------------------------------------------------------------

const NODE_ICONS: Record<NodeKind, React.ComponentType<{ className?: string }>> = {
    contract: FileText,
    termsheet: FileText,
    redline: FileText,
    client: MessageSquare,
    memo: FileText,
    precedent: SearchIcon,
    risk: AlertTriangle,
    research: SearchIcon,
    gate: Shield,
};

const ACTOR_ICONS: Record<ActorKind, React.ComponentType<{ className?: string }>> = {
    agent: Bot,
    human: User,
    gate: Shield,
};

// Color is driven by *status* (not actor) so the eye reads "what's
// happening here" at a glance.
const STATUS_STYLE: Record<NodeStatus, { card: string; chip: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
    idle:           { card: "bg-white border-gray-300 text-gray-800",           chip: "bg-gray-100 text-gray-700",     label: "Idle",            icon: PlayCircle },
    running:        { card: "bg-blue-50 border-blue-300 text-blue-900",         chip: "bg-blue-100 text-blue-700",     label: "Running",         icon: Loader2 },
    done:           { card: "bg-emerald-50 border-emerald-300 text-emerald-900", chip: "bg-emerald-100 text-emerald-700", label: "Done",            icon: CheckCircle2 },
    blocked:        { card: "bg-red-50 border-red-300 text-red-900",            chip: "bg-red-100 text-red-700",       label: "Blocked",         icon: AlertTriangle },
    needs_approval: { card: "bg-amber-50 border-amber-400 text-amber-900",      chip: "bg-amber-100 text-amber-800",   label: "Needs approval",  icon: Shield },
};

const ADD_PALETTE: { kind: NodeKind; label: string; actor: ActorKind }[] = [
    { kind: "client",    label: "Human input", actor: "human" },
    { kind: "termsheet", label: "Term sheet",  actor: "agent" },
    { kind: "redline",   label: "Redline",     actor: "agent" },
    { kind: "precedent", label: "Precedent",   actor: "agent" },
    { kind: "research",  label: "Research",    actor: "agent" },
    { kind: "risk",      label: "Risk scan",   actor: "agent" },
    { kind: "memo",      label: "Memo",        actor: "agent" },
    { kind: "contract",  label: "Contract",    actor: "agent" },
    { kind: "gate",      label: "Approval gate", actor: "gate" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DraftingBoardPage() {
    return (
        <Suspense
            fallback={
                <div className="p-12 text-sm text-gray-500">loading board…</div>
            }
        >
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

interface TimelineEntry {
    t: string;
    actor: ActorKind;
    text: string;
}

function DraftingBoardInner() {
    const params = useSearchParams();
    const router = useRouter();
    const docId = params.get("docId");
    const sugIds = params.get("suggestions");

    const [templateId, setTemplateId] = useState<string>("ma");
    const [boardName, setBoardName] = useState<string>(T_MA.label);
    const [nodes, setNodes] = useState<BoardNode[]>(T_MA.nodes);
    const [links, setLinks] = useState<Link[]>(T_MA.links);
    const [statusFilter, setStatusFilter] = useState<"all" | NodeStatus>(
        "all",
    );
    const [selected, setSelected] = useState<string | null>(null);
    const [incomingSuggestions, setIncomingSuggestions] = useState<
        IncomingSuggestion[]
    >([]);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([
        { t: "—", actor: "human", text: "Board loaded from template: M&A." },
    ]);
    const [dragId, setDragId] = useState<string | null>(null);
    const [agentRunning, setAgentRunning] = useState(false);
    const [agentProgress, setAgentProgress] = useState(0);
    const dragOriginRef =
        typeof window !== "undefined"
            ? ((window as unknown as {
                  __louisDrag?: { x: number; y: number; ox: number; oy: number };
              }).__louisDrag =
                  (
                      window as unknown as {
                          __louisDrag?: {
                              x: number;
                              y: number;
                              ox: number;
                              oy: number;
                          };
                      }
                  ).__louisDrag ?? { x: 0, y: 0, ox: 0, oy: 0 })
            : { x: 0, y: 0, ox: 0, oy: 0 };

    function loadTemplate(id: string) {
        const t = TEMPLATES.find((x) => x.id === id);
        if (!t) return;
        setTemplateId(t.id);
        setBoardName(t.label);
        setNodes(t.nodes);
        setLinks(t.links);
        setSelected(null);
        setTimeline([
            {
                t: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                actor: "human",
                text: `Board loaded from template: ${t.label}.`,
            },
        ]);
    }

    function addNode(kind: NodeKind, actor: ActorKind) {
        const id = `n-${Date.now().toString(36)}`;
        // Drop near top-left of the open area
        const maxY = nodes.reduce((m, n) => Math.max(m, n.y), 0);
        const y = Math.min(maxY + 80, 540);
        const labelMap: Record<NodeKind, string> = {
            client: "Human input",
            termsheet: "Term sheet",
            redline: "Redline",
            precedent: "Precedent search",
            research: "Research",
            risk: "Risk scan",
            memo: "Memo",
            contract: "Contract",
            gate: "Approval gate",
        };
        const next: BoardNode = {
            id,
            kind,
            actor,
            title: labelMap[kind],
            subtitle: "Click to configure",
            x: 80 + (nodes.length % 3) * 280,
            y,
            status: "idle",
        };
        setNodes((prev) => [...prev, next]);
        setSelected(id);
    }

    function deleteNode(id: string) {
        setNodes((prev) => prev.filter((n) => n.id !== id));
        setLinks((prev) => prev.filter(([a, b]) => a !== id && b !== id));
        if (selected === id) setSelected(null);
    }

    function setNodeStatus(id: string, status: NodeStatus) {
        setNodes((prev) =>
            prev.map((n) => (n.id === id ? { ...n, status } : n)),
        );
    }

    function onNodeMouseDown(e: React.MouseEvent, id: string) {
        const t = e.target as HTMLElement;
        if (t.closest("button, a, input, textarea")) return;
        const node = nodes.find((n) => n.id === id);
        if (!node) return;
        e.preventDefault();
        setDragId(id);
        dragOriginRef.x = e.clientX;
        dragOriginRef.y = e.clientY;
        dragOriginRef.ox = node.x;
        dragOriginRef.oy = node.y;

        const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - dragOriginRef.x;
            const dy = ev.clientY - dragOriginRef.y;
            setNodes((prev) =>
                prev.map((n) =>
                    n.id === id
                        ? {
                              ...n,
                              x: Math.max(0, dragOriginRef.ox + dx),
                              y: Math.max(0, dragOriginRef.oy + dy),
                          }
                        : n,
                ),
            );
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            setDragId(null);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }

    // If we arrived from /doc-workspace with ?suggestions=ids, hydrate them.
    useEffect(() => {
        if (!docId || !sugIds) {
            setIncomingSuggestions([]);
            return;
        }
        (async () => {
            try {
                const headers = await authHeaders();
                const r = await fetch(
                    `${API_BASE}/api/doc-workspace/${encodeURIComponent(docId)}/suggestions`,
                    { headers },
                );
                if (!r.ok) return;
                const json = await r.json();
                const allowed = new Set(sugIds.split(",").filter(Boolean));
                const filtered: IncomingSuggestion[] = (json.suggestions ?? [])
                    .filter(
                        (s: { id: string; state: string }) =>
                            allowed.has(s.id) && s.state === "open",
                    );
                setIncomingSuggestions(filtered);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [docId, sugIds]);

    async function runAgent() {
        if (agentRunning) return;
        setAgentRunning(true);
        setAgentProgress(0);

        // Real skill router probe — surfaces actual fired skill IDs for the
        // top-of-board scenario.
        let routedSkills: string[] = [];
        try {
            const probe = await fetch(`${API_BASE}/api/skills/route-test`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: `${boardName} — next step. MENA jurisdiction.`,
                }),
            });
            if (probe.ok) {
                const j = await probe.json();
                routedSkills = (j.skillIds ?? []).slice(0, 5);
            }
        } catch {
            /* fall through to demo */
        }

        // Find the next idle / running node and walk it through statuses.
        const pending = nodes.find(
            (n) =>
                n.status === "idle" ||
                n.status === "running" ||
                n.status === "needs_approval",
        );
        if (!pending) {
            setAgentRunning(false);
            pushTimeline(
                "agent",
                "Nothing to run — every node is done or blocked.",
            );
            return;
        }

        pushTimeline("agent", `Agent run started on "${pending.title}".`);
        if (routedSkills.length) {
            pushTimeline(
                "agent",
                `Skill router fired: ${routedSkills.join(", ")}.`,
            );
        }
        setNodes((prev) =>
            prev.map((n) =>
                n.id === pending.id
                    ? { ...n, status: "running", skillsUsed: routedSkills }
                    : n,
            ),
        );

        // Simulate progress
        const totalSteps = 5;
        for (let i = 0; i < totalSteps; i++) {
            await new Promise((r) => setTimeout(r, 700));
            setAgentProgress(Math.round(((i + 1) / totalSteps) * 100));
        }

        // Decide outcome: gate → needs_approval, else → done.
        if (pending.actor === "gate") {
            setNodeStatus(pending.id, "needs_approval");
            pushTimeline(
                "gate",
                `"${pending.title}" awaits human approval.`,
            );
        } else {
            setNodeStatus(pending.id, "done");
            pushTimeline("agent", `"${pending.title}" complete.`);
            // Unblock downstream nodes that were waiting on this one.
            const downstream = links
                .filter(([from]) => from === pending.id)
                .map(([, to]) => to);
            if (downstream.length) {
                setNodes((prev) =>
                    prev.map((n) =>
                        downstream.includes(n.id) && n.status === "blocked"
                            ? { ...n, status: "idle" }
                            : n,
                    ),
                );
            }
        }

        setAgentProgress(100);
        setTimeout(() => setAgentProgress(0), 400);
        setAgentRunning(false);
    }

    function approveGate(id: string) {
        setNodeStatus(id, "done");
        pushTimeline("human", `"${nodes.find((n) => n.id === id)?.title}" approved.`);
        // Unblock downstream
        const downstream = links
            .filter(([from]) => from === id)
            .map(([, to]) => to);
        if (downstream.length) {
            setNodes((prev) =>
                prev.map((n) =>
                    downstream.includes(n.id) && n.status === "blocked"
                        ? { ...n, status: "idle" }
                        : n,
                ),
            );
        }
    }

    function pushTimeline(actor: ActorKind, text: string) {
        const t = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
        setTimeline((prev) => [{ t, actor, text }, ...prev]);
    }

    const selectedNode = selected
        ? nodes.find((n) => n.id === selected) ?? null
        : null;
    const visibleNodes =
        statusFilter === "all"
            ? nodes
            : nodes.filter((n) => n.status === statusFilter);
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
    const pendingApprovals = nodes.filter(
        (n) => n.status === "needs_approval",
    );

    const STATUS_COUNTS = {
        idle: nodes.filter((n) => n.status === "idle").length,
        running: nodes.filter((n) => n.status === "running").length,
        done: nodes.filter((n) => n.status === "done").length,
        blocked: nodes.filter((n) => n.status === "blocked").length,
        needs_approval: nodes.filter((n) => n.status === "needs_approval")
            .length,
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white">
                <Network className="w-5 h-5 text-amber-700" />
                <input
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    className="font-medium text-sm bg-transparent outline-none border-b border-transparent focus:border-gray-300 min-w-[200px]"
                />
                {docId && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                        doc: {docId}
                    </Badge>
                )}
                <div className="ml-auto flex items-center gap-2">
                    {pendingApprovals.length > 0 && (
                        <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-900 border border-amber-300"
                        >
                            {pendingApprovals.length} approval pending
                        </Badge>
                    )}
                    <Button
                        size="sm"
                        variant="default"
                        onClick={runAgent}
                        disabled={agentRunning}
                        className="h-8"
                    >
                        {agentRunning ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                Running… {agentProgress}%
                            </>
                        ) : (
                            <>
                                <PlayCircle className="w-3.5 h-3.5 mr-1" />
                                Run agent
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left rail */}
                <div className="w-[200px] flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
                    <div className="px-3 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">
                            <LayoutTemplate className="w-3 h-3" />
                            Templates
                        </div>
                        {TEMPLATES.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => loadTemplate(t.id)}
                                title={t.description}
                                className={`w-full text-left px-2 py-1.5 rounded text-xs mb-1 transition-colors ${
                                    templateId === t.id
                                        ? "bg-gray-900 text-white"
                                        : "hover:bg-gray-100 text-gray-700"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="px-3 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">
                            <Plus className="w-3 h-3" />
                            Add node
                        </div>
                        {ADD_PALETTE.map((p) => {
                            const Icon = NODE_ICONS[p.kind];
                            return (
                                <button
                                    key={p.kind}
                                    onClick={() => addNode(p.kind, p.actor)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-gray-100 text-gray-700 mb-0.5"
                                >
                                    <Icon className="w-3 h-3 text-gray-500" />
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="px-3 py-3">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-gray-500 mb-2">
                            Filter by status
                        </div>
                        {(
                            [
                                "all",
                                "idle",
                                "running",
                                "needs_approval",
                                "done",
                                "blocked",
                            ] as const
                        ).map((s) => {
                            const count =
                                s === "all"
                                    ? nodes.length
                                    : STATUS_COUNTS[s as NodeStatus];
                            return (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`w-full flex items-center justify-between gap-2 px-2 py-1 text-xs rounded mb-0.5 ${
                                        statusFilter === s
                                            ? "bg-gray-900 text-white"
                                            : "hover:bg-gray-100 text-gray-700"
                                    }`}
                                >
                                    <span>
                                        {s === "all"
                                            ? "All"
                                            : STATUS_STYLE[s as NodeStatus]
                                                  .label}
                                    </span>
                                    <span className="text-[10px] opacity-70">
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 relative overflow-auto bg-gray-50">
                    <div className="absolute inset-0 [background-image:radial-gradient(#0001_1px,transparent_1px)] [background-size:24px_24px]" />
                    <div className="relative" style={{ width: 1200, height: 700 }}>
                        {/* Links */}
                        <svg
                            className="absolute inset-0 pointer-events-none"
                            width={1200}
                            height={700}
                        >
                            <defs>
                                <marker
                                    id="arrow"
                                    viewBox="0 0 10 10"
                                    refX="9"
                                    refY="5"
                                    markerWidth="6"
                                    markerHeight="6"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                                </marker>
                            </defs>
                            {links.map(([from, to], i) => {
                                const a = nodes.find((n) => n.id === from);
                                const b = nodes.find((n) => n.id === to);
                                if (!a || !b) return null;
                                const visible =
                                    statusFilter === "all" ||
                                    (visibleNodeIds.has(a.id) &&
                                        visibleNodeIds.has(b.id));
                                return (
                                    <line
                                        key={i}
                                        x1={a.x + 240}
                                        y1={a.y + 40}
                                        x2={b.x}
                                        y2={b.y + 40}
                                        stroke="#94a3b8"
                                        strokeWidth={1.4}
                                        strokeDasharray={
                                            b.status === "blocked" ? "3 3" : ""
                                        }
                                        opacity={visible ? 1 : 0.2}
                                        markerEnd="url(#arrow)"
                                    />
                                );
                            })}
                        </svg>
                        {/* Nodes */}
                        {nodes.map((n) => {
                            const Icon = NODE_ICONS[n.kind];
                            const ActorIcon = ACTOR_ICONS[n.actor];
                            const style = STATUS_STYLE[n.status];
                            const StatusIcon = style.icon;
                            const isDragging = dragId === n.id;
                            const dimmed =
                                statusFilter !== "all" &&
                                !visibleNodeIds.has(n.id);
                            return (
                                <div
                                    key={n.id}
                                    role="button"
                                    tabIndex={0}
                                    onMouseDown={(e) => onNodeMouseDown(e, n.id)}
                                    onClick={() => setSelected(n.id)}
                                    className={`absolute w-60 rounded-lg border-2 p-3 text-left shadow-sm transition-all ${style.card} ${
                                        selected === n.id
                                            ? "ring-2 ring-offset-2 ring-gray-900"
                                            : ""
                                    } ${
                                        isDragging
                                            ? "cursor-grabbing opacity-90 shadow-lg"
                                            : "cursor-grab hover:shadow-md"
                                    } ${dimmed ? "opacity-25" : ""}`}
                                    style={{
                                        left: n.x,
                                        top: n.y,
                                        zIndex: isDragging ? 100 : 1,
                                        userSelect: "none",
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Icon className="w-4 h-4" />
                                        <span className="font-medium text-sm truncate flex-1">
                                            {n.title}
                                        </span>
                                        <ActorIcon className="w-3.5 h-3.5 opacity-70" />
                                    </div>
                                    <div className="text-xs opacity-70 truncate mb-2">
                                        {n.subtitle}
                                    </div>
                                    <div
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${style.chip}`}
                                    >
                                        <StatusIcon
                                            className={`w-3 h-3 ${n.status === "running" ? "animate-spin" : ""}`}
                                        />
                                        {style.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right rail */}
                <div className="w-[380px] flex-shrink-0 border-l border-gray-200 flex flex-col bg-white">
                    {selectedNode ? (
                        <NodeDetailPanel
                            node={selectedNode}
                            onClose={() => setSelected(null)}
                            onDelete={() => deleteNode(selectedNode.id)}
                            onApprove={() => approveGate(selectedNode.id)}
                            onReset={() =>
                                setNodeStatus(selectedNode.id, "idle")
                            }
                            onOpen={() => {
                                if (selectedNode.docId) {
                                    router.push(
                                        `/doc-workspace?docId=${encodeURIComponent(selectedNode.docId)}`,
                                    );
                                }
                            }}
                            hasDoc={!!selectedNode.docId}
                        />
                    ) : (
                        <div className="px-5 py-4 border-b border-gray-200 text-xs text-gray-500">
                            Click a node to see its detail, skills used, and
                            actions.
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        {incomingSuggestions.length > 0 && (
                            <>
                                <div className="px-5 py-3 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Incoming from Doc · {incomingSuggestions.length}
                                </div>
                                {incomingSuggestions.map((s) => {
                                    const sevColor =
                                        s.severity === "high"
                                            ? "bg-red-500"
                                            : s.severity === "medium"
                                              ? "bg-yellow-500"
                                              : "bg-blue-400";
                                    return (
                                        <div
                                            key={s.id}
                                            className="px-5 py-3 border-b border-gray-100 flex items-start gap-3 hover:bg-gray-50"
                                        >
                                            <span
                                                className={`w-2 h-2 rounded-full mt-1.5 ${sevColor}`}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 truncate">
                                                    {s.title}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate">
                                                    {s.section}
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    );
                                })}
                            </>
                        )}
                        <div className="px-5 py-3 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Timeline · {timeline.length}
                        </div>
                        {timeline.map((e, i) => {
                            const ActorIcon = ACTOR_ICONS[e.actor];
                            return (
                                <div
                                    key={i}
                                    className="px-5 py-3 border-b border-gray-100 flex items-start gap-3"
                                >
                                    <ActorIcon className="w-4 h-4 mt-0.5 text-gray-500" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-gray-500">
                                            {e.t}
                                        </div>
                                        <div className="text-sm text-gray-800">
                                            {e.text}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => router.push("/legal-flows")}
                        >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Run a structured Legal Flow
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NodeDetailPanel({
    node,
    onClose,
    onDelete,
    onApprove,
    onReset,
    onOpen,
    hasDoc,
}: {
    node: BoardNode;
    onClose: () => void;
    onDelete: () => void;
    onApprove: () => void;
    onReset: () => void;
    onOpen: () => void;
    hasDoc: boolean;
}) {
    const style = STATUS_STYLE[node.status];
    const StatusIcon = style.icon;
    return (
        <div className="border-b border-gray-200">
            <div className="px-5 py-4">
                <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                            {node.kind} · {node.actor}
                        </div>
                        <h2 className="font-semibold text-gray-900 truncate">
                            {node.title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 text-sm"
                        aria-label="Close detail"
                    >
                        ×
                    </button>
                </div>
                <p className="text-sm text-gray-600 mb-3">{node.subtitle}</p>
                <div
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium mb-3 ${style.chip}`}
                >
                    <StatusIcon
                        className={`w-3 h-3 ${node.status === "running" ? "animate-spin" : ""}`}
                    />
                    {style.label}
                </div>

                {node.skillsUsed && node.skillsUsed.length > 0 && (
                    <div className="mb-3">
                        <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                            Skills fired
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {node.skillsUsed.map((s) => (
                                <span
                                    key={s}
                                    className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"
                                >
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {node.status === "needs_approval" && (
                        <Button size="sm" onClick={onApprove}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Approve
                        </Button>
                    )}
                    {hasDoc && (
                        <Button size="sm" variant="outline" onClick={onOpen}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Open doc
                        </Button>
                    )}
                    {node.status === "done" && (
                        <Button size="sm" variant="ghost" onClick={onReset}>
                            Reset
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onDelete}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}
