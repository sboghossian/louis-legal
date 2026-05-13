"use client";

/**
 * Visual primitives for the Drafting Board graph: NodeCard + StatusDot +
 * Edge SVGs.
 *
 * Status drives both color and animation:
 *   idle             → cream card, dashed gold rule
 *   running          → blue tint, pulsing dot (.louis-pulse)
 *   done             → emerald tint, check icon
 *   blocked          → red tint, alert icon
 *   needs_approval   → amber tint, breathing border (.louis-shimmer)
 *   rejected         → red tint, X icon
 *
 * Kind drives the icon and the lane it lives in.
 */

import {
    FileText,
    Sparkles,
    Users,
    CheckCircle2,
    GitBranch,
    Loader2,
    AlertTriangle,
    XCircle,
    Clock3,
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import type { BoardNode, NodeKind, NodeStatus } from "./types";

interface KindStyle {
    icon: React.ComponentType<{ className?: string }>;
    laneLabel: string;
    /** Base background + border for the *idle* state. */
    base: string;
    /** Accent (left rail or icon chip). */
    accent: string;
}

export const KIND_STYLES: Record<NodeKind, KindStyle> = {
    input: {
        icon: FileText,
        laneLabel: "Input",
        base: "bg-[#F5F0E5]/70 border-[#E7E2D6]",
        accent: "bg-muted text-muted-foreground",
    },
    agent: {
        icon: Sparkles,
        laneLabel: "Agent step",
        base: "bg-amber-50/80 border-amber-200",
        accent: "bg-amber-100 text-amber-700",
    },
    gate: {
        icon: Users,
        laneLabel: "Human gate",
        // Dashed border for human gates per the brief.
        base: "bg-card border-dashed border-border",
        accent: "bg-muted text-foreground/80",
    },
    output: {
        icon: CheckCircle2,
        laneLabel: "Output",
        base: "bg-emerald-50/80 border-emerald-200",
        accent: "bg-emerald-100 text-emerald-700",
    },
    branch: {
        icon: GitBranch,
        laneLabel: "Branch",
        base: "bg-violet-50 border-violet-200",
        accent: "bg-violet-100 text-violet-700",
    },
};

interface StatusStyle {
    label: string;
    /** Overrides on top of the kind's base. Empty string for "no override". */
    cardOverride: string;
    chip: string;
    icon: React.ComponentType<{ className?: string }>;
    animateClass?: string;
}

export const STATUS_STYLES: Record<NodeStatus, StatusStyle> = {
    idle: {
        label: "Idle",
        cardOverride: "",
        chip: "bg-muted text-muted-foreground",
        icon: Clock3,
    },
    running: {
        label: "Running",
        cardOverride:
            "ring-2 ring-[#C9A961]/60 shadow-[0_8px_30px_-12px_rgba(201,169,97,0.55)]",
        chip: "bg-amber-100 text-amber-800",
        icon: Loader2,
        animateClass: "louis-shimmer",
    },
    done: {
        label: "Done",
        cardOverride: "ring-1 ring-emerald-300/70",
        chip: "bg-emerald-100 text-emerald-700",
        icon: CheckCircle2,
    },
    blocked: {
        label: "Blocked",
        cardOverride: "ring-1 ring-red-300 bg-red-50/80",
        chip: "bg-red-100 text-red-700",
        icon: AlertTriangle,
    },
    needs_approval: {
        label: "Needs approval",
        cardOverride: "ring-2 ring-amber-400/60",
        chip: "bg-amber-100 text-amber-800",
        icon: Users,
        animateClass: "louis-shimmer",
    },
    rejected: {
        label: "Rejected",
        cardOverride: "ring-1 ring-red-300 bg-red-50/80",
        chip: "bg-red-100 text-red-700",
        icon: XCircle,
    },
};

// ---------------------------------------------------------------------------
// NodeCard
// ---------------------------------------------------------------------------

interface NodeCardProps {
    node: BoardNode;
    x: number;
    y: number;
    width: number;
    height: number;
    selected: boolean;
    onSelect: (id: string) => void;
}

export function NodeCard({
    node,
    x,
    y,
    width,
    height,
    selected,
    onSelect,
}: NodeCardProps) {
    const { t } = useLocale();
    const kind = KIND_STYLES[node.kind];
    const status = STATUS_STYLES[node.status];
    const KindIcon = kind.icon;
    const StatusIcon = status.icon;
    const isRunning = node.status === "running";
    const showShimmer =
        node.status === "running" || node.status === "needs_approval";

    return (
        <button
            type="button"
            onClick={() => onSelect(node.id)}
            className={[
                "absolute group text-left",
                "rounded-2xl border transition-shadow",
                "backdrop-blur-sm",
                kind.base,
                status.cardOverride,
                selected
                    ? "shadow-[0_18px_40px_-20px_rgba(31,41,55,0.35)] ring-2 ring-[#C9A961]"
                    : "shadow-[0_10px_24px_-18px_rgba(31,41,55,0.35)]",
                "hover:shadow-[0_18px_40px_-20px_rgba(31,41,55,0.45)]",
            ].join(" ")}
            style={{
                left: x,
                top: y,
                width,
                height,
            }}
        >
            {/* Breathing accent on running / needs_approval — sits over the
                card but below content, so the user sees motion at a glance. */}
            {showShimmer && (
                <span
                    aria-hidden
                    className={[
                        "pointer-events-none absolute inset-0 rounded-2xl",
                        "border border-[#C9A961]/40",
                        "louis-shimmer",
                    ].join(" ")}
                />
            )}

            <div className="relative flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span
                            className={[
                                "flex h-7 w-7 items-center justify-center rounded-lg",
                                kind.accent,
                            ].join(" ")}
                        >
                            <KindIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {kind.laneLabel}
                        </span>
                    </div>

                    <span
                        className={[
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            status.chip,
                        ].join(" ")}
                    >
                        <StatusIcon
                            className={[
                                "h-3 w-3",
                                isRunning ? "animate-spin" : "",
                            ].join(" ")}
                        />
                        {t(`drafting.status.${node.status}`)}
                    </span>
                </div>

                <div className="mt-2 flex-1">
                    <div
                        className="font-serif text-[15px] leading-tight text-foreground"
                        style={{ fontFamily: "var(--font-eb-garamond)" }}
                    >
                        {node.title}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {node.subtitle}
                    </div>
                </div>

                {/* Pulsing dot rail at the bottom while running. */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    {node.skills.length > 0 ? (
                        <span className="truncate font-mono">
                            {node.skills.length === 1
                                ? node.skills[0]
                                : `${node.skills[0]} +${node.skills.length - 1}`}
                        </span>
                    ) : (
                        <span className="opacity-0">.</span>
                    )}
                    {isRunning && (
                        <span className="flex items-center gap-1">
                            <span className="louis-pulse h-1.5 w-1.5 rounded-full bg-[#C9A961]" />
                            <span>working…</span>
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ---------------------------------------------------------------------------
// Edge — drawn in a single <svg> behind the nodes.
// ---------------------------------------------------------------------------

export type EdgeState = "unrun" | "running" | "done" | "blocked";

const EDGE_COLORS: Record<EdgeState, string> = {
    unrun: "#CBD5E1", // slate-300
    running: "#C9A961", // louis gold
    done: "#10B981", // emerald-500
    blocked: "#EF4444", // red-500
};

interface EdgeProps {
    d: string;
    state: EdgeState;
}

export function Edge({ d, state }: EdgeProps) {
    const stroke = EDGE_COLORS[state];
    const dashed = state === "unrun";
    return (
        <g>
            <path
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={state === "running" ? 2.4 : 1.8}
                strokeDasharray={dashed ? "5 5" : undefined}
                strokeLinecap="round"
                className={state === "running" ? "louis-shimmer" : undefined}
            />
            {/* small arrowhead at end */}
            <path
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={1.8}
                markerEnd="url(#louis-arrow)"
                opacity={0}
            />
        </g>
    );
}

export function EdgeMarker() {
    return (
        <defs>
            <marker
                id="louis-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
            >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
            </marker>
        </defs>
    );
}
