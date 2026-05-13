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
                    <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        {kind.laneLabel}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1 text-slate-400 hover:bg-card hover:text-slate-700"
                    aria-label="Close inspector"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div
                className="mt-3 font-serif text-2xl leading-tight text-slate-900"
                style={{ fontFamily: "var(--font-eb-garamond)" }}
            >
                {node.title}
            </div>
            <div className="mt-1 text-sm text-slate-500">{node.subtitle}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                <StatusIcon
                    className={[
                        "h-3 w-3",
                        node.status === "running" ? "animate-spin" : "",
                    ].join(" ")}
                />
                {status.label}
                {node.reason && (
                    <span className="ml-1 text-slate-400">· {node.reason}</span>
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
                            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onPatch(node.id, { title, subtitle });
                                setEditing(false);
                            }}
                            className="rounded-md bg-slate-900 px-2 py-1 text-white hover:bg-slate-800"
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
                    <span className="text-xs text-slate-500">Tap to rename</span>
                    <Pencil className="h-3.5 w-3.5 text-slate-400" />
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
                    <div className="text-xs text-slate-500">
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
                                    className="flex w-full items-center justify-between px-2 py-1 text-left font-mono text-[11px] text-slate-700 hover:bg-amber-50"
                                >
                                    <span>{s}</span>
                                    <Plus className="h-3 w-3 text-slate-400" />
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
                <label className="block text-xs text-slate-500">
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
                <label className="block text-xs text-slate-500">
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
                    <div className="px-1 py-1 text-xs italic text-slate-400">
                        none
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {items.map((s) => (
                            <li
                                key={s}
                                className="rounded-md px-1.5 py-1 text-xs text-slate-700"
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
                    <div className="text-xs italic text-slate-400">
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
                                <span className="flex-1 text-slate-600">
                                    <span className="font-medium text-slate-800">
                                        {STATUS_STYLES[h.from].label}
                                    </span>{" "}
                                    →{" "}
                                    <span className="font-medium text-slate-800">
                                        {STATUS_STYLES[h.to].label}
                                    </span>
                                    {h.note && (
                                        <span className="block text-[11px] text-slate-500">
                                            {h.note}
                                        </span>
                                    )}
                                </span>
                                <span className="text-[10px] text-slate-400">
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
        <div className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
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
