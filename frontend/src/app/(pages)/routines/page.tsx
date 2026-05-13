"use client";

import { useEffect, useState } from "react";
import { Repeat, Plus, Play, Pause, Clock, Mail, Slack, MessageSquare, Trash2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/app/contexts/ConfirmDialog";
import { useLocale } from "@/contexts/LocaleContext";

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

const KIND_LABEL_KEYS: Record<Routine["kind"], string> = {
    digest: "routines.kind.digest",
    alert: "routines.kind.alert",
    newsletter: "routines.kind.newsletter",
    report: "routines.kind.report",
    "deadline-sweep": "routines.kind.deadline_sweep",
    custom: "routines.kind.custom",
};

const OUTPUT_ICONS: Record<Routine["outputChannel"], typeof Mail> = {
    email: Mail,
    slack: Slack,
    "in-app": MessageSquare,
};

const SCHEDULE_PRESET_KEYS: { key: string; cron: string }[] = [
    { key: "routines.preset.daily_8am", cron: "0 8 * * *" },
    { key: "routines.preset.weekdays_8am", cron: "0 8 * * 1-5" },
    { key: "routines.preset.weekly_mon", cron: "0 9 * * 1" },
    { key: "routines.preset.weekly_fri", cron: "0 16 * * 5" },
    { key: "routines.preset.monthly", cron: "0 9 1 * *" },
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
    const { t } = useLocale();
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
            title: t("routines.delete.title"),
            message: t("routines.delete.message", { title: r.title }),
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
                <h1 className="text-lg font-semibold">{t("routines.title")}</h1>
                <Badge variant="secondary">{t("routines.active", { count: routines.filter(r => r.enabled).length })}</Badge>
                <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={refresh}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> {t("action.refresh")}
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={() => setShowNew(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> {t("routines.new")}
                </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
                {t("routines.intro")}
            </p>

            {loading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
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
                                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t(KIND_LABEL_KEYS[r.kind])}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</div>
                                </div>
                                <button
                                    onClick={() => toggle(r)}
                                    className={`p-1.5 rounded text-xs ${r.enabled ? "text-green-700 hover:bg-green-50" : "text-muted-foreground hover:bg-muted"}`}
                                    title={r.enabled ? t("routines.pause") : t("routines.activate")}
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
                                <span>{t("routines.last", { time: formatTime(r.lastRunAt) })}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => runNow(r)} className="text-blue-600 hover:underline">{t("routines.run_now")}</button>
                                    <button onClick={() => openRuns(r)} className="text-muted-foreground hover:underline">{t("routines.runs")}</button>
                                    <button onClick={() => remove(r)} className="text-red-600 hover:underline">{t("action.delete")}</button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {!loading && routines.length === 0 && (
                    <div className="col-span-2 text-center text-sm text-muted-foreground py-12">
                        {t("routines.empty")}
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
    const { t } = useLocale();
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
                    <h2 className="font-semibold">{t("routines.modal.title")}</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="overflow-y-auto px-6 py-4 space-y-3">
                    <div>
                        <Label className="text-xs">{t("routines.modal.title_field")}</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t("routines.modal.title_placeholder")} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t("routines.modal.description")}</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <Label className="text-xs">{t("routines.modal.prompt")}</Label>
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder={t("routines.modal.prompt_placeholder")}
                            rows={3}
                            className="mt-1 w-full border border-border rounded px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">{t("routines.modal.kind")}</Label>
                            <select value={kind} onChange={e => setKind(e.target.value as Routine["kind"])} className="mt-1 w-full border border-border rounded px-3 py-2 text-sm">
                                {Object.entries(KIND_LABEL_KEYS).map(([k, labelKey]) => <option key={k} value={k}>{t(labelKey)}</option>)}
                            </select>
                        </div>
                        <div>
                            <Label className="text-xs">{t("routines.modal.output")}</Label>
                            <select value={outputChannel} onChange={e => setOutputChannel(e.target.value as Routine["outputChannel"])} className="mt-1 w-full border border-border rounded px-3 py-2 text-sm">
                                <option value="in-app">{t("routines.modal.output.inapp")}</option>
                                <option value="email">{t("routines.modal.output.email")}</option>
                                <option value="slack">{t("routines.modal.output.slack")}</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">{t("routines.modal.schedule")}</Label>
                        <div className="flex gap-2 mt-1">
                            <Input value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="0 9 * * 1" className="font-mono" />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {SCHEDULE_PRESET_KEYS.map(p => (
                                <button
                                    key={p.cron}
                                    onClick={() => setSchedule(p.cron)}
                                    className="text-[10px] px-2 py-0.5 bg-muted hover:bg-muted rounded"
                                >
                                    {t(p.key)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm pt-2">
                        <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
                        <span>{t("routines.modal.enabled_label")}</span>
                    </label>
                </div>
                <div className="px-6 py-4 border-t flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>{t("action.cancel")}</Button>
                    <Button onClick={submit} disabled={submitting || !title.trim() || !prompt.trim()}>
                        {submitting ? t("routines.modal.creating") : t("routines.modal.create")}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function RunsModal({ routine, runs, onClose }: { routine: Routine; runs: RoutineRun[]; onClose: () => void }) {
    const { t } = useLocale();
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">{t("routines.runs.title")}</h2>
                        <div className="text-xs text-muted-foreground mt-0.5">{routine.title}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
                </div>
                <div className="overflow-y-auto px-6 py-4 space-y-2">
                    {runs.length === 0 && <div className="text-sm text-muted-foreground italic">{t("routines.runs.empty")}</div>}
                    {runs.map(run => (
                        <div key={run.id} className="border rounded p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    run.status === "succeeded" ? "bg-green-100 text-green-700"
                                        : run.status === "failed" ? "bg-red-100 text-red-700"
                                            : "bg-amber-100 text-amber-700"
                                }`}>{t(`routines.runs.status.${run.status}`)}</span>
                                <span className="text-xs text-muted-foreground">{t("routines.runs.started", { time: new Date(run.startedAt).toLocaleString() })}</span>
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
