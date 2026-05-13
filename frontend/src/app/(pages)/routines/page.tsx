"use client";

import { useEffect, useState } from "react";
import { Repeat, Plus, Play, Pause, Clock, Mail, Slack, MessageSquare, Trash2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/app/contexts/ConfirmDialog";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface Routine {
    id: string;
    title: string;
    description?: string;
    schedule: string;
    timezone: string;
    prompt: string;
    outputChannel: "email" | "slack" | "in-app";
    kind: "digest" | "alert" | "newsletter" | "report" | "deadline-sweep" | "custom";
    enabled: boolean;
    lastRunAt?: string;
    nextRunAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface RoutineRun {
    id: string;
    routineId: string;
    startedAt: string;
    completedAt?: string;
    output?: string;
    error?: string;
    status: "running" | "succeeded" | "failed";
}

const KIND_LABEL: Record<Routine["kind"], string> = {
    digest: "Digest",
    alert: "Alert",
    newsletter: "Newsletter",
    report: "Report",
    "deadline-sweep": "Deadline Sweep",
    custom: "Custom",
};

const OUTPUT_ICONS: Record<Routine["outputChannel"], typeof Mail> = {
    email: Mail,
    slack: Slack,
    "in-app": MessageSquare,
};

const SCHEDULE_PRESETS: { label: string; cron: string }[] = [
    { label: "Daily · 8:00 AM", cron: "0 8 * * *" },
    { label: "Weekdays · 8:00 AM", cron: "0 8 * * 1-5" },
    { label: "Weekly · Mon 9 AM", cron: "0 9 * * 1" },
    { label: "Weekly · Fri 4 PM", cron: "0 16 * * 5" },
    { label: "Monthly · 1st 9 AM", cron: "0 9 1 * *" },
];

function formatTime(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function RoutinesPage() {
    const confirm = useConfirm();
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showNew, setShowNew] = useState(false);
    const [showRuns, setShowRuns] = useState<Routine | null>(null);
    const [runs, setRuns] = useState<RoutineRun[]>([]);

    async function refresh() {
        setLoading(true);
        setError(null);
        try {
            const r = await fetch(`${API_BASE}/api/routines`, { headers: { "x-user-id": "demo" } });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const j = await r.json();
            setRoutines(j.routines ?? []);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, []);

    async function toggle(r: Routine) {
        const updated = { ...r, enabled: !r.enabled };
        setRoutines(prev => prev.map(x => x.id === r.id ? updated : x));
        await fetch(`${API_BASE}/api/routines/${r.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "x-user-id": "demo" },
            body: JSON.stringify({ enabled: updated.enabled }),
        });
    }

    async function runNow(r: Routine) {
        await fetch(`${API_BASE}/api/routines/${r.id}/run`, {
            method: "POST",
            headers: { "x-user-id": "demo" },
        });
        // Poll the runs after a moment
        setTimeout(() => refresh(), 250);
    }

    async function remove(r: Routine) {
        const ok = await confirm({
            title: "Delete this routine?",
            message: `"${r.title}" will stop running and its history will be removed.`,
            destructive: true,
        });
        if (!ok) return;
        await fetch(`${API_BASE}/api/routines/${r.id}`, {
            method: "DELETE",
            headers: { "x-user-id": "demo" },
        });
        refresh();
    }

    async function openRuns(r: Routine) {
        setShowRuns(r);
        const resp = await fetch(`${API_BASE}/api/routines/${r.id}/runs`, { headers: { "x-user-id": "demo" } });
        const j = await resp.json();
        setRuns(j.runs ?? []);
    }

    return (
        <div className="max-w-5xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Repeat className="w-5 h-5" />
                <h1 className="text-lg font-semibold">Routines</h1>
                <Badge variant="secondary">{routines.filter(r => r.enabled).length} active</Badge>
                <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={refresh}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => setShowNew(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> New routine
                </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
                Recurring AI tasks: digests, alerts, newsletters, scheduled reports. Schedules use cron expressions; Louis dispatches to the chosen channel.
            </p>

            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>}

            <div className="grid grid-cols-2 gap-4">
                {routines.map(r => {
                    const OutIcon = OUTPUT_ICONS[r.outputChannel] || MessageSquare;
                    return (
                        <div key={r.id} className={`border rounded-lg p-4 ${r.enabled ? "border-border bg-card" : "border-border bg-muted opacity-75"}`}>
                            <div className="flex items-start gap-3 mb-2">
                                <Repeat className="w-5 h-5 text-foreground/80 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-sm truncate">{r.title}</span>
                                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{KIND_LABEL[r.kind]}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</div>
                                </div>
                                <button
                                    onClick={() => toggle(r)}
                                    className={`p-1.5 rounded text-xs ${r.enabled ? "text-green-700 hover:bg-green-50" : "text-muted-foreground hover:bg-muted"}`}
                                    title={r.enabled ? "Pause" : "Activate"}
                                >
                                    {r.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span className="font-mono">{r.schedule}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <OutIcon className="w-3 h-3" />
                                    <span>{r.outputChannel}</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                                <span>last: {formatTime(r.lastRunAt)}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => runNow(r)} className="text-blue-600 hover:underline">Run now</button>
                                    <button onClick={() => openRuns(r)} className="text-muted-foreground hover:underline">Runs</button>
                                    <button onClick={() => remove(r)} className="text-red-600 hover:underline">Delete</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {!loading && routines.length === 0 && (
                    <div className="col-span-2 text-center text-sm text-muted-foreground py-12">
                        No routines yet. Click "New routine" to create one.
                    </div>
                )}
            </div>

            {showNew && (
                <NewRoutineModal
                    onClose={() => setShowNew(false)}
                    onCreated={() => { setShowNew(false); refresh(); }}
                />
            )}

            {showRuns && (
                <RunsModal
                    routine={showRuns}
                    runs={runs}
                    onClose={() => setShowRuns(null)}
                />
            )}
        </div>
    );
}

function NewRoutineModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [prompt, setPrompt] = useState("");
    const [schedule, setSchedule] = useState("0 9 * * 1");
    const [kind, setKind] = useState<Routine["kind"]>("digest");
    const [outputChannel, setOutputChannel] = useState<Routine["outputChannel"]>("in-app");
    const [enabled, setEnabled] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    async function submit() {
        if (!title.trim() || !prompt.trim() || !schedule.trim()) return;
        setSubmitting(true);
        try {
            const r = await fetch(`${API_BASE}/api/routines`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": "demo" },
                body: JSON.stringify({ title, description, prompt, schedule, kind, outputChannel, enabled }),
            });
            if (r.ok) onCreated();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg w-full max-w-xl max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold">New routine</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="overflow-y-auto px-6 py-4 space-y-3">
                    <div>
                        <Label className="text-xs">Title</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Weekly Matters Digest" className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">Description (optional)</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">Prompt</Label>
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="Compile a weekly digest of all active matters and upcoming deadlines."
                            rows={3}
                            className="mt-1 w-full border border-border rounded px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Kind</Label>
                            <select value={kind} onChange={e => setKind(e.target.value as Routine["kind"])} className="mt-1 w-full border border-border rounded px-3 py-2 text-sm">
                                {Object.entries(KIND_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label className="text-xs">Output</Label>
                            <select value={outputChannel} onChange={e => setOutputChannel(e.target.value as Routine["outputChannel"])} className="mt-1 w-full border border-border rounded px-3 py-2 text-sm">
                                <option value="in-app">In-app</option>
                                <option value="email">Email</option>
                                <option value="slack">Slack</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Schedule (cron)</Label>
                        <div className="flex gap-2 mt-1">
                            <Input value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="0 9 * * 1" className="font-mono" />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {SCHEDULE_PRESETS.map(p => (
                                <button
                                    key={p.cron}
                                    onClick={() => setSchedule(p.cron)}
                                    className="text-[10px] px-2 py-0.5 bg-muted hover:bg-muted rounded"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm pt-2">
                        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
                        <span>Enabled (run on schedule)</span>
                    </label>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={submit} disabled={submitting || !title.trim() || !prompt.trim()}>
                        {submitting ? "Creating…" : "Create routine"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function RunsModal({ routine, runs, onClose }: { routine: Routine; runs: RoutineRun[]; onClose: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Run history</h2>
                        <div className="text-xs text-muted-foreground mt-0.5">{routine.title}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="overflow-y-auto px-6 py-4 space-y-2">
                    {runs.length === 0 && <div className="text-sm text-muted-foreground italic">No runs yet. Click "Run now" to trigger one.</div>}
                    {runs.map(run => (
                        <div key={run.id} className="border rounded p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    run.status === "succeeded" ? "bg-green-100 text-green-700"
                                        : run.status === "failed" ? "bg-red-100 text-red-700"
                                            : "bg-amber-100 text-amber-700"
                                }`}>{run.status}</span>
                                <span className="text-xs text-muted-foreground">started {new Date(run.startedAt).toLocaleString()}</span>
                            </div>
                            {run.output && <div className="text-xs whitespace-pre-wrap bg-muted p-2 rounded font-mono">{run.output}</div>}
                            {run.error && <div className="text-xs whitespace-pre-wrap bg-red-50 text-red-700 p-2 rounded">{run.error}</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
