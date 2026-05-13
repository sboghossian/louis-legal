"use client";

/**
 * Drafting Board — auto-layout node graph for agentic legal workflows.
 *
 * Layout (top-to-bottom lanes):
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ Top bar (template name · Run agent · template switcher)        │
 *   ├──────────────────────────────────────────────┬─────────────────┤
 *   │ Canvas                                        │ Right inspector │
 *   │  · auto-laid graph (dagre-style, in-house)    │  · node detail  │
 *   │  · SVG edges (dashed / gold / emerald)        │  · skills       │
 *   │  · timeline strip at the bottom               │  · approve gate │
 *   └──────────────────────────────────────────────┴─────────────────┘
 *
 * State machine: idle → running → done (happy path); idle → blocked;
 * gates flip to needs_approval and pause the runner; approval unblocks,
 * rejection cascades blocked downstream.
 *
 * Persistence: localStorage.louis.drafting-board.<templateKey>.
 *
 * The actual node/edge/runner/inspector pieces live under
 * frontend/src/app/components/drafting/ so this page stays thin.
 */

import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
    Play,
    RotateCcw,
    Sparkles,
    LayoutTemplate,
    AlertTriangle,
    ChevronRight,
} from "lucide-react";

import { useLocale } from "@/contexts/LocaleContext";

import type { Board, BoardNode } from "@/app/components/drafting/types";
import {
    computeLayout,
    edgePath,
    NODE_WIDTH,
    NODE_HEIGHT,
} from "@/app/components/drafting/auto-layout";
import {
    Edge,
    EdgeMarker,
    NodeCard,
    type EdgeState,
} from "@/app/components/drafting/nodes";
import { Inspector } from "@/app/components/drafting/inspector";
import {
    approveGate,
    completeNode,
    isStalled,
    pickNext,
    rejectGate,
    startNode,
} from "@/app/components/drafting/runner";
import { TEMPLATES, seedBoardByKey } from "@/app/components/drafting/seed";
import {
    loadBoard,
    saveBoard,
    clearBoard,
} from "@/app/components/drafting/storage";

const DEFAULT_TEMPLATE = "ma";

interface TimelineEntry {
    at: number;
    text: string;
    kind: "info" | "run" | "done" | "block";
}

// ---------------------------------------------------------------------------
// Page shell — Suspense so useSearchParams is happy under Next.
// ---------------------------------------------------------------------------

export default function DraftingBoardPage() {
    return (
        <Suspense
            fallback={
                <div className="p-12 text-sm text-slate-500">
                    Opening the drafting board…
                </div>
            }
        >
            <DraftingBoardInner />
        </Suspense>
    );
}

// ---------------------------------------------------------------------------
// Inner page
// ---------------------------------------------------------------------------

function DraftingBoardInner() {
    const params = useSearchParams();
    const urlTemplate = params.get("template");

    const [board, setBoard] = useState<Board | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

    // Refs to avoid stale closures inside the run-loop timeouts.
    const boardRef = useRef<Board | null>(null);
    const runningRef = useRef(false);
    boardRef.current = board;
    runningRef.current = running;

    // ----- bootstrap: load from URL ?template= or localStorage -------------
    useEffect(() => {
        const key = urlTemplate ?? DEFAULT_TEMPLATE;
        const stored = loadBoard(key);
        if (stored) {
            setBoard(stored);
            pushTimeline(`Restored "${stored.name}" from the last session.`, "info");
            return;
        }
        const seeded = seedBoardByKey(key);
        if (seeded) {
            setBoard(seeded);
            pushTimeline(`Loaded the "${seeded.name}" template.`, "info");
        }
        // If urlTemplate doesn't match anything, board stays null → empty state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlTemplate]);

    // ----- autosave on every board mutation --------------------------------
    useEffect(() => {
        if (!board) return;
        saveBoard(board);
    }, [board]);

    function pushTimeline(text: string, kind: TimelineEntry["kind"] = "info") {
        setTimeline((t) => [...t, { at: Date.now(), text, kind }]);
    }

    // ----- template management ---------------------------------------------
    function chooseTemplate(key: string) {
        const seeded = seedBoardByKey(key);
        if (!seeded) return;
        setBoard(seeded);
        setSelectedId(null);
        setTimeline([
            {
                at: Date.now(),
                text: `Loaded the "${seeded.name}" template.`,
                kind: "info",
            },
        ]);
    }

    function resetBoard() {
        if (!board) return;
        clearBoard(board.templateKey);
        const fresh = seedBoardByKey(board.templateKey);
        if (fresh) {
            setBoard(fresh);
            setSelectedId(null);
            setTimeline([
                {
                    at: Date.now(),
                    text: `Reset "${fresh.name}". Every step is idle again.`,
                    kind: "info",
                },
            ]);
        }
    }

    // ----- runner ----------------------------------------------------------
    const tick = useCallback(() => {
        if (!runningRef.current || !boardRef.current) return;
        const current = boardRef.current;

        const pick = pickNext(current);

        // Gate flipped to needs_approval — pause and surface a banner.
        if (pick.paused && pick.candidate) {
            setBoard(pick.nextBoard);
            setRunning(false);
            setSelectedId(pick.candidate.id);
            if (pick.note) pushTimeline(pick.note, "info");
            return;
        }

        // Nothing actionable left.
        if (!pick.candidate) {
            setRunning(false);
            if (isStalled(current)) {
                pushTimeline("The graph has nothing left to run.", "info");
            }
            return;
        }

        // Start the node, then schedule its completion.
        const { nextBoard, dwellMs, log } = startNode(
            pick.nextBoard,
            pick.candidate.id,
        );
        setBoard(nextBoard);
        pushTimeline(log, "run");

        window.setTimeout(() => {
            if (!runningRef.current || !boardRef.current) return;
            const finished = completeNode(boardRef.current, pick.candidate!.id);
            setBoard(finished.nextBoard);
            if (finished.log) pushTimeline(finished.log, "done");
            // Loop.
            window.setTimeout(tick, 240);
        }, dwellMs);
    }, []);

    function startRunner() {
        if (!board) return;
        if (running) return;
        setRunning(true);
        // Defer one tick so React has flushed the running=true commit
        // before tick() reads runningRef.
        window.setTimeout(tick, 50);
    }

    function pauseRunner() {
        setRunning(false);
    }

    // ----- node mutations --------------------------------------------------
    function patchNode(id: string, patch: Partial<BoardNode>) {
        setBoard((b) => {
            if (!b) return b;
            return {
                ...b,
                nodes: b.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
            };
        });
    }

    function handleApprove(id: string) {
        if (!board) return;
        const res = approveGate(board, id);
        setBoard(res.nextBoard);
        if (res.log) pushTimeline(res.log, "done");
        // Auto-resume the runner so downstream nodes start.
        setRunning(true);
        window.setTimeout(tick, 60);
    }

    function handleReject(id: string, reason: string) {
        if (!board) return;
        const res = rejectGate(board, id, reason);
        setBoard(res.nextBoard);
        if (res.log) pushTimeline(res.log, "block");
        setRunning(false);
    }

    // ----- selection -------------------------------------------------------
    const selectedNode = useMemo(() => {
        if (!board || !selectedId) return null;
        return board.nodes.find((n) => n.id === selectedId) ?? null;
    }, [board, selectedId]);

    // ----- empty state -----------------------------------------------------
    if (!board) {
        return <EmptyState onPick={chooseTemplate} />;
    }

    const needsApprovalNode = board.nodes.find(
        (n) => n.status === "needs_approval",
    );

    return (
        <div
            className="flex h-full min-h-screen w-full overflow-hidden"
            style={{ background: "var(--louis-cream, #FBF8F2)" }}
        >
            <div className="flex h-full min-h-screen flex-1 flex-col overflow-hidden">
                <TopBar
                    board={board}
                    running={running}
                    onRun={startRunner}
                    onPause={pauseRunner}
                    onReset={resetBoard}
                    onPick={chooseTemplate}
                />
                {needsApprovalNode && (
                    <ApprovalBanner
                        node={needsApprovalNode}
                        onOpen={() => setSelectedId(needsApprovalNode.id)}
                    />
                )}
                <Canvas
                    board={board}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                />
                <Timeline timeline={timeline} />
            </div>

            {selectedNode && (
                <Inspector
                    node={selectedNode}
                    onClose={() => setSelectedId(null)}
                    onPatch={patchNode}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

function TopBar({
    board,
    running,
    onRun,
    onPause,
    onReset,
    onPick,
}: {
    board: Board;
    running: boolean;
    onRun: () => void;
    onPause: () => void;
    onReset: () => void;
    onPick: (key: string) => void;
}) {
    const { t } = useLocale();
    return (
        <div className="flex items-center justify-between gap-4 border-b border-[#E7E2D6] bg-[#FBF8F2]/90 px-6 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
                <span
                    className="font-serif text-xl text-slate-900"
                    style={{ fontFamily: "var(--font-eb-garamond)" }}
                >
                    {t(`drafting.template.${board.templateKey}`)}
                </span>
                <span className="text-[11px] text-slate-500">
                    {t("drafting.steps", { count: board.nodes.length })}
                </span>
            </div>
            <div className="flex items-center gap-2">
                <TemplateSwitcher current={board.templateKey} onPick={onPick} />
                <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center gap-1 rounded-md border border-[#E7E2D6] bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-[#F5F0E5]"
                >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
                {running ? (
                    <button
                        type="button"
                        onClick={onPause}
                        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                        <span className="louis-pulse h-2 w-2 rounded-full bg-[#C9A961]" />
                        Pause
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onRun}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#1F2937] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0F172A]"
                    >
                        <Play className="h-3.5 w-3.5" />
                        Run agent
                    </button>
                )}
            </div>
        </div>
    );
}

function TemplateSwitcher({
    current,
    onPick,
}: {
    current: string;
    onPick: (key: string) => void;
}) {
    const { t } = useLocale();
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E2D6] bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-[#F5F0E5]"
            >
                <LayoutTemplate className="h-3.5 w-3.5" />
                {t("drafting.use_template")}
            </button>
            {open && (
                <div className="absolute right-0 z-30 mt-1 w-72 overflow-hidden rounded-xl border border-[#E7E2D6] bg-white shadow-lg">
                    {TEMPLATES.map((tpl) => (
                        <button
                            key={tpl.key}
                            type="button"
                            onClick={() => {
                                onPick(tpl.key);
                                setOpen(false);
                            }}
                            className={[
                                "flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-[#F5F0E5]",
                                current === tpl.key ? "bg-[#F5F0E5]" : "",
                            ].join(" ")}
                        >
                            <Sparkles className="mt-0.5 h-3.5 w-3.5 text-[#C9A961]" />
                            <div className="flex-1">
                                <div className="font-medium text-slate-900">
                                    {t(`drafting.template.${tpl.key}`)}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                    {tpl.blurb}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Approval banner
// ---------------------------------------------------------------------------

function ApprovalBanner({
    node,
    onOpen,
}: {
    node: BoardNode;
    onOpen: () => void;
}) {
    const { t } = useLocale();
    return (
        <div className="flex items-center justify-between gap-3 border-b border-amber-200/70 bg-amber-50/80 px-6 py-2.5 text-xs text-amber-900">
            <div className="flex items-center gap-2">
                <span className="louis-shimmer inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
                    <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <span>
                    {t("drafting.needs_approval", { title: node.title })}
                    {node.approver ? ` — ${node.approver}` : ""}.
                </span>
            </div>
            <button
                type="button"
                onClick={onOpen}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 font-medium text-slate-800 shadow-sm hover:bg-amber-100"
            >
                {t("action.open")}
                <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Canvas — auto-laid graph
// ---------------------------------------------------------------------------

function Canvas({
    board,
    selectedId,
    onSelect,
}: {
    board: Board;
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const { positions, width, height } = useMemo(
        () => computeLayout(board),
        [board],
    );

    return (
        <div
            className="relative flex-1 overflow-auto"
            style={{ background: "var(--louis-cream, #FBF8F2)" }}
        >
            {/* Subtle cream grain */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 10% 0%, rgba(201,169,97,0.06), transparent 40%), radial-gradient(circle at 90% 100%, rgba(31,41,55,0.04), transparent 40%)",
                }}
            />
            <div
                className="relative mx-auto"
                style={{ width, minHeight: height }}
            >
                <svg
                    width={width}
                    height={height}
                    className="pointer-events-none absolute inset-0"
                >
                    <EdgeMarker />
                    {board.edges.map((e) => {
                        const a = positions[e.from];
                        const b = positions[e.to];
                        if (!a || !b) return null;
                        const state = edgeState(board, e);
                        return (
                            <Edge
                                key={`${e.from}->${e.to}`}
                                d={edgePath(a, b)}
                                state={state}
                            />
                        );
                    })}
                </svg>

                {board.nodes.map((n) => {
                    const p = positions[n.id];
                    if (!p) return null;
                    return (
                        <NodeCard
                            key={n.id}
                            node={n}
                            x={p.x}
                            y={p.y}
                            width={NODE_WIDTH}
                            height={NODE_HEIGHT}
                            selected={selectedId === n.id}
                            onSelect={onSelect}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function edgeState(board: Board, e: { from: string; to: string }): EdgeState {
    const from = board.nodes.find((n) => n.id === e.from);
    const to = board.nodes.find((n) => n.id === e.to);
    if (!from || !to) return "unrun";
    if (to.status === "blocked" || from.status === "rejected") return "blocked";
    if (from.status === "done" && to.status === "done") return "done";
    if (from.status === "done" && to.status === "running") return "running";
    if (from.status === "running") return "running";
    if (from.status === "done") return "done";
    return "unrun";
}

// ---------------------------------------------------------------------------
// Timeline (bottom strip)
// ---------------------------------------------------------------------------

function Timeline({ timeline }: { timeline: TimelineEntry[] }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.scrollLeft = ref.current.scrollWidth;
        }
    }, [timeline]);

    if (timeline.length === 0) return null;

    return (
        <div className="shrink-0 border-t border-[#E7E2D6] bg-[#FBF8F2]/95 px-6 py-2">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Run log
            </div>
            <div
                ref={ref}
                className="flex gap-3 overflow-x-auto pb-1"
            >
                {timeline.map((t, i) => (
                    <div
                        key={`${t.at}-${i}`}
                        className={[
                            "shrink-0 rounded-md border px-2 py-1 text-[11px]",
                            t.kind === "run"
                                ? "border-amber-200 bg-amber-50 text-amber-900"
                                : t.kind === "done"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : t.kind === "block"
                                    ? "border-red-200 bg-red-50 text-red-800"
                                    : "border-[#E7E2D6] bg-white text-slate-600",
                        ].join(" ")}
                    >
                        <span className="mr-2 text-[10px] text-slate-400">
                            {fmt(t.at)}
                        </span>
                        {t.text}
                    </div>
                ))}
            </div>
        </div>
    );
}

function fmt(ms: number): string {
    try {
        return new Date(ms).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } catch {
        return "";
    }
}

// ---------------------------------------------------------------------------
// Empty state — pick a template
// ---------------------------------------------------------------------------

function EmptyState({ onPick }: { onPick: (key: string) => void }) {
    const { t } = useLocale();
    return (
        <div
            className="flex min-h-screen w-full items-center justify-center px-6 py-12"
            style={{ background: "var(--louis-cream, #FBF8F2)" }}
        >
            <div className="w-full max-w-2xl">
                <div className="text-center">
                    <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F0E5]">
                        <Sparkles className="h-5 w-5 text-[#C9A961]" />
                    </div>
                    <h1
                        className="mt-4 font-serif text-3xl text-slate-900"
                        style={{ fontFamily: "var(--font-eb-garamond)" }}
                    >
                        {t("drafting.start_template")}
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Pick a workflow shape that's close to your matter. Louis
                        will wire the skills and pause at the human gates so you
                        always have the last word.
                    </p>
                </div>
                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {TEMPLATES.map((tpl) => (
                        <button
                            key={tpl.key}
                            type="button"
                            onClick={() => onPick(tpl.key)}
                            className="group flex flex-col items-start gap-2 rounded-2xl border border-[#E7E2D6] bg-white p-4 text-left shadow-[0_10px_24px_-18px_rgba(31,41,55,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(31,41,55,0.45)]"
                        >
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F0E5] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#8a743f]">
                                <LayoutTemplate className="h-3 w-3" /> template
                            </span>
                            <div
                                className="font-serif text-xl text-slate-900"
                                style={{
                                    fontFamily: "var(--font-eb-garamond)",
                                }}
                            >
                                {t(`drafting.template.${tpl.key}`)}
                            </div>
                            <p className="text-xs text-slate-600">{tpl.blurb}</p>
                            <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#8a743f]">
                                {t("drafting.open_template")}
                                <ChevronRight className="h-3 w-3" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
