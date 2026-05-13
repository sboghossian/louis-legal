"use client";

/**
 * Right-rail node inspector for the Drafting Board.
 *
 * - Shows the node's name, type, status, history, skills fired, inputs,
 *   outputs.
 * - Agent steps: editable "What skill should fire here?" picker (free-text
 *   for now — autocompletes against the curated list).
 * - Human gates: editable approval question + approver picker, plus
 *   Approve / Reject buttons that drive the runner.
 */

import { useMemo, useState } from "react";
import {
    X,
    Check,
    Ban,
    Pencil,
    Plus,
    Sparkles,
} from "lucide-react";
import type { BoardNode, NodeStatus } from "./types";
import { KIND_STYLES, STATUS_STYLES } from "./nodes";

/** A small curated palette of skill slugs the picker autocompletes against. */
export const SKILL_SUGGESTIONS = [
    "corporate-ma",
    "corporate-commercial",
    "corporate-governance",
    "employment",
    "privacy-data-protection",
    "fintech-payments",
    "ip-licensing",
    "disputes-litigation",
    "arbitration",
    "legal-ops-billing",
    "draft.share-purchase-agreement",
    "draft.shareholders-agreement",
    "draft.shareholder-resolution",
    "draft.MSA",
    "draft.NDA-mutual",
    "draft.IP-assignment",
    "draft.offer-letter",
    "draft.employment-contract-UAE",
    "draft.employment-contract-KSA",
    "draft.DPA-GDPR",
    "draft.DPA-UAE-PDPL",
    "draft.DPA-KSA-PDPL",
    "draft.KYC-procedure",
    "connector.OFAC-sanctions",
    "efirm.conflict-check",
    "pa-workflow.transactional.contract-redline-20min",
    "prompt-pack.full-contract-risk-review",
    "prompt-pack.due-diligence-report",
    "output.partner-memo-style",
];

const APPROVERS = [
    "Partner — M&A",
    "Partner — Corporate",
    "Relationship partner",
    "General Counsel",
    "Hiring manager",
    "Privacy officer",
    "Compliance lead",
];

interface InspectorProps {
    node: BoardNode | null;
    onClose: () => void;
    onPatch: (id: string, patch: Partial<BoardNode>) => void;
    onApprove: (id: string) => void;
    onReject: (id: string, reason: string) => void;
}

export function Inspector({
    node,
    onClose,
    onPatch,
    onApprove,
    onReject,
}: InspectorProps) {
    if (!node) return null;
    return (
        <aside
            className={[
                "h-full w-[360px] shrink-0",
                "border-l border-[#E7E2D6] bg-[#FBF8F2]/95",
                "flex flex-col overflow-hidden",
            ].join(" ")}
        >
            <Header node={node} onClose={onClose} />
            <div className="flex-1 overflow-y-auto px-5 pb-8">
                <Identity node={node} onPatch={onPatch} />
                {node.lastOutput !== undefined && node.lastOutput.length > 0 && (
                    <LatestOutput node={node} />
                )}
                {node.kind === "agent" && (
                    <SkillsEditor node={node} onPatch={onPatch} />
                )}
                {node.kind === "gate" && (
                    <GateEditor
                        node={node}
                        onPatch={onPatch}
                        onApprove={onApprove}
                        onReject={onReject}
                    />
                )}
                <InputsOutputs node={node} />
                <History node={node} />
            </div>
        </aside>
    );
}

function LatestOutput({ node }: { node: BoardNode }) {
    const meta: string[] = [];
    if (node.lastModel) meta.push(node.lastModel);
    if (node.lastPlaybookSlug) meta.push(node.lastPlaybookSlug);
    const ago = node.lastRunAt ? timeAgo(node.lastRunAt) : null;
    if (ago) meta.push(ago);
    return (
        <section className="mt-5">
            <div className="mb-1.5 flex items-center gap-2 px-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Latest output
                </span>
                <span
                    aria-hidden
                    className="h-px flex-1"
                    style={{
                        background:
                            "linear-gradient(to right, #C9A961 0%, rgba(201,169,97,0) 100%)",
                    }}
                />
            </div>
            <div className="rounded-xl border border-[#E7E2D6] bg-card p-3">
                <pre className="font-serif whitespace-pre-wrap text-sm text-foreground">
                    {node.lastOutput}
                </pre>
                {meta.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                        Ran with {meta.join(" · ")}
                    </div>
                )}
            </div>
        </section>
    );
}

function timeAgo(iso: string): string {
    try {
        const then = Date.parse(iso);
        if (Number.isNaN(then)) return "";
        const diff = Date.now() - then;
        const s = Math.max(1, Math.round(diff / 1000));
        if (s < 60) return `${s}s ago`;
        const m = Math.round(s / 60);
        if (m < 60) return `${m}m ago`;
        const h = Math.round(m / 60);
        if (h < 24) return `${h}h ago`;
        const d = Math.round(h / 24);
        return `${d}d ago`;
    } catch {
        return "";
    }
}

function Header({
    node,
    onClose,
}: {
    node: BoardNode;
    onClose: () => void;
}) {
    const kind = KIND_STYLES[node.kind];
    const status = STATUS_STYLES[node.status];
    const KindIcon = kind.icon;
    const StatusIcon = status.icon;
    return (
        <div className="border-b border-[#E7E2D6] px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
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
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-card hover:text-foreground/80"
                    aria-label="Close inspector"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div
                className="mt-3 font-serif text-2xl leading-tight text-foreground"
                style={{ fontFamily: "var(--font-eb-garamond)" }}
            >
                {node.title}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{node.subtitle}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-foreground/80 shadow-sm">
                <StatusIcon
                    className={[
                        "h-3 w-3",
                        node.status === "running" ? "animate-spin" : "",
                    ].join(" ")}
                />
                {status.label}
                {node.reason && (
                    <span className="ml-1 text-muted-foreground">· {node.reason}</span>
                )}
            </div>
        </div>
    );
}

function Identity({
    node,
    onPatch,
}: {
    node: BoardNode;
    onPatch: (id: string, patch: Partial<BoardNode>) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(node.title);
    const [subtitle, setSubtitle] = useState(node.subtitle);
    return (
        <section className="mt-5">
            <SectionLabel title="Identity" />
            {editing ? (
                <div className="space-y-2 rounded-xl border border-[#E7E2D6] bg-card p-3">
                    <input
                        className="w-full rounded-md border border-[#E7E2D6] bg-card px-2 py-1 text-sm"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                    />
                    <textarea
                        className="w-full rounded-md border border-[#E7E2D6] bg-card px-2 py-1 text-sm"
                        value={subtitle}
                        rows={2}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="One-line subtitle"
                    />
                    <div className="flex justify-end gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => {
                                setTitle(node.title);
                                setSubtitle(node.subtitle);
                                setEditing(false);
                            }}
                            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onPatch(node.id, { title, subtitle });
                                setEditing(false);
                            }}
                            className="rounded-md bg-foreground px-2 py-1 text-white hover:bg-foreground/90"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-1 py-1 text-left hover:border-[#E7E2D6] hover:bg-card"
                >
                    <span className="text-xs text-muted-foreground">Tap to rename</span>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
            )}
        </section>
    );
}

function SkillsEditor({
    node,
    onPatch,
}: {
    node: BoardNode;
    onPatch: (id: string, patch: Partial<BoardNode>) => void;
}) {
    const [draft, setDraft] = useState("");
    const filtered = useMemo(() => {
        const q = draft.trim().toLowerCase();
        if (!q) return SKILL_SUGGESTIONS.slice(0, 6);
        return SKILL_SUGGESTIONS.filter(
            (s) => s.toLowerCase().includes(q) && !node.skills.includes(s),
        ).slice(0, 6);
    }, [draft, node.skills]);

    function add(slug: string) {
        if (!slug) return;
        if (node.skills.includes(slug)) return;
        onPatch(node.id, { skills: [...node.skills, slug] });
        setDraft("");
    }

    return (
        <section className="mt-5">
            <SectionLabel title="What skill should fire here?" />
            <div className="space-y-2 rounded-xl border border-[#E7E2D6] bg-card p-3">
                {node.skills.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                        No skill wired yet. Pick one below.
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {node.skills.map((s) => (
                            <span
                                key={s}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-mono text-[11px] text-amber-800"
                            >
                                <Sparkles className="h-3 w-3" />
                                {s}
                                <button
                                    type="button"
                                    className="ml-1 text-amber-600 hover:text-amber-900"
                                    onClick={() =>
                                        onPatch(node.id, {
                                            skills: node.skills.filter(
                                                (x) => x !== s,
                                            ),
                                        })
                                    }
                                    aria-label={`Remove ${s}`}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                <div className="relative">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                add(draft.trim());
                            }
                        }}
                        placeholder="Search a skill slug…"
                        className="w-full rounded-md border border-[#E7E2D6] bg-[#FBF8F2] px-2 py-1.5 text-xs"
                    />
                    {filtered.length > 0 && (
                        <div className="mt-1 max-h-44 overflow-y-auto rounded-md border border-[#E7E2D6] bg-card shadow-sm">
                            {filtered.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => add(s)}
                                    className="flex w-full items-center justify-between px-2 py-1 text-left font-mono text-[11px] text-foreground/80 hover:bg-amber-50"
                                >
                                    <span>{s}</span>
                                    <Plus className="h-3 w-3 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function GateEditor({
    node,
    onPatch,
    onApprove,
    onReject,
}: {
    node: BoardNode;
    onPatch: (id: string, patch: Partial<BoardNode>) => void;
    onApprove: (id: string) => void;
    onReject: (id: string, reason: string) => void;
}) {
    const [reason, setReason] = useState("");
    return (
        <section className="mt-5">
            <SectionLabel title="Approval gate" />
            <div className="space-y-3 rounded-xl border border-[#E7E2D6] bg-card p-3">
                <label className="block text-xs text-muted-foreground">
                    What's the question?
                    <textarea
                        className="mt-1 w-full rounded-md border border-[#E7E2D6] bg-[#FBF8F2] px-2 py-1 text-sm"
                        rows={3}
                        value={node.approvalQuestion ?? ""}
                        onChange={(e) =>
                            onPatch(node.id, {
                                approvalQuestion: e.target.value,
                            })
                        }
                    />
                </label>
                <label className="block text-xs text-muted-foreground">
                    Who approves?
                    <select
                        className="mt-1 w-full rounded-md border border-[#E7E2D6] bg-[#FBF8F2] px-2 py-1 text-sm"
                        value={node.approver ?? ""}
                        onChange={(e) =>
                            onPatch(node.id, { approver: e.target.value })
                        }
                    >
                        <option value="">(unassigned)</option>
                        {APPROVERS.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                </label>

                {node.status === "needs_approval" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                        <div className="text-[11px] font-medium text-amber-900">
                            Needs your approval
                        </div>
                        <div className="mt-2 flex flex-col gap-2">
                            <input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Optional reason if rejecting"
                                className="rounded-md border border-amber-200 bg-card px-2 py-1 text-xs"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onApprove(node.id)}
                                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                                >
                                    <Check className="h-3.5 w-3.5" /> Approve
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        onReject(
                                            node.id,
                                            reason.trim() ||
                                                "Rejected without reason",
                                        )
                                    }
                                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                                >
                                    <Ban className="h-3.5 w-3.5" /> Reject
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

function InputsOutputs({ node }: { node: BoardNode }) {
    return (
        <section className="mt-5 grid grid-cols-2 gap-3">
            <Column label="Consumes" items={node.inputs} />
            <Column label="Produces" items={node.outputs} />
        </section>
    );
}

function Column({ label, items }: { label: string; items: string[] }) {
    return (
        <div>
            <SectionLabel title={label} />
            <div className="rounded-xl border border-[#E7E2D6] bg-card p-2">
                {items.length === 0 ? (
                    <div className="px-1 py-1 text-xs italic text-muted-foreground">
                        none
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {items.map((s) => (
                            <li
                                key={s}
                                className="rounded-md px-1.5 py-1 text-xs text-foreground/80"
                            >
                                {s}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function History({ node }: { node: BoardNode }) {
    return (
        <section className="mt-5">
            <SectionLabel title="History" />
            <div className="rounded-xl border border-[#E7E2D6] bg-card p-3">
                {node.history.length === 0 ? (
                    <div className="text-xs italic text-muted-foreground">
                        Nothing has happened yet.
                    </div>
                ) : (
                    <ol className="space-y-2">
                        {node.history.map((h, i) => (
                            <li
                                key={`${h.at}-${i}`}
                                className="flex items-start gap-2 text-xs"
                            >
                                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[#C9A961]" />
                                <span className="flex-1 text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                        {STATUS_STYLES[h.from].label}
                                    </span>{" "}
                                    →{" "}
                                    <span className="font-medium text-foreground">
                                        {STATUS_STYLES[h.to].label}
                                    </span>
                                    {h.note && (
                                        <span className="block text-[11px] text-muted-foreground">
                                            {h.note}
                                        </span>
                                    )}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {fmtTime(h.at)}
                                </span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </section>
    );
}

function SectionLabel({ title }: { title: string }) {
    return (
        <div className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {title}
        </div>
    );
}

function fmtTime(ms: number): string {
    try {
        const d = new Date(ms);
        return d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "";
    }
}

// status type used by inspector imports — re-export so consumers can type
// arguments without pulling from `./types` directly.
export type { NodeStatus };
