"use client";

import { useEffect, useState } from "react";
import { Workflow, Play, Pause, RotateCcw, Trash2, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface FlowSummary {
    id: string;
    title: string;
    description: string;
    category: string;
    jurisdictions: string[];
    stepCount: number;
}

interface FlowStep {
    id: string;
    title: string;
    description: string;
    skills?: string[];
    tools?: string[];
    inputs?: { name: string; type: string; required: boolean; description?: string }[];
    outputs?: string[];
    requiresReview?: boolean;
}

interface FlowTemplate extends FlowSummary {
    steps: FlowStep[];
    estimatedDuration?: string;
}

interface FlowRun {
    id: string;
    flowId: string;
    status: "active" | "paused" | "completed" | "abandoned";
    currentStepId: string;
    stepHistory: { stepId: string; startedAt: string; completedAt?: string; note?: string }[];
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

const STATUS_STYLE: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    paused: "bg-amber-100 text-amber-700",
    completed: "bg-blue-100 text-blue-700",
    abandoned: "bg-muted text-muted-foreground",
};

export default function LegalFlowsPage() {
    const [view, setView] = useState<"library" | "runs">("library");
    const [templates, setTemplates] = useState<FlowSummary[]>([]);
    const [runs, setRuns] = useState<FlowRun[]>([]);
    const [selectedTpl, setSelectedTpl] = useState<FlowTemplate | null>(null);
    const [selectedRun, setSelectedRun] = useState<{ run: FlowRun; template: FlowTemplate } | null>(null);
    const [loading, setLoading] = useState(true);

    async function refresh() {
        setLoading(true);
        try {
            const [tplR, runR] = await Promise.all([
                fetch(`${API_BASE}/api/legal-flows/templates`),
                fetch(`${API_BASE}/api/legal-flows/runs`, { headers: { "x-user-id": "demo" } }),
            ]);
            const t = await tplR.json();
            const r = await runR.json();
            setTemplates(t.templates ?? []);
            setRuns(r.runs ?? []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, []);

    async function openTemplate(id: string) {
        const r = await fetch(`${API_BASE}/api/legal-flows/templates/${id}`);
        if (r.ok) setSelectedTpl(await r.json());
    }

    async function startRun(flowId: string) {
        const r = await fetch(`${API_BASE}/api/legal-flows/runs`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": "demo" },
            body: JSON.stringify({ flowId }),
        });
        if (r.ok) {
            await refresh();
            const run = await r.json();
            await openRun(run.id);
            setView("runs");
        }
    }

    async function openRun(id: string) {
        const r = await fetch(`${API_BASE}/api/legal-flows/runs/${id}`, { headers: { "x-user-id": "demo" } });
        if (r.ok) setSelectedRun(await r.json());
    }

    async function completeStep(runId: string, note?: string) {
        const r = await fetch(`${API_BASE}/api/legal-flows/runs/${runId}/complete-step`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": "demo" },
            body: JSON.stringify({ output: { completedAt: new Date().toISOString() }, note }),
        });
        if (r.ok) {
            await refresh();
            await openRun(runId);
        }
    }

    async function runAction(runId: string, action: "pause" | "resume" | "abandon") {
        await fetch(`${API_BASE}/api/legal-flows/runs/${runId}/${action}`, {
            method: "POST",
            headers: { "x-user-id": "demo" },
        });
        await refresh();
        await openRun(runId);
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-[380px] flex-shrink-0 border-r border-border flex flex-col">
                <div className="px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2 mb-3">
                        <Workflow className="w-5 h-5 text-foreground/80" />
                        <h1 className="text-lg font-semibold">Legal Flows</h1>
                    </div>
                    <div className="flex gap-1.5">
                        <FilterChip active={view === "library"} onClick={() => setView("library")}>
                            Library {templates.length > 0 && `· ${templates.length}`}
                        </FilterChip>
                        <FilterChip active={view === "runs"} onClick={() => setView("runs")}>
                            Runs {runs.length > 0 && `· ${runs.length}`}
                        </FilterChip>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading && <div className="p-6 text-sm text-muted-foreground">loading…</div>}
                    {view === "library" && templates.map(t => (
                        <button
                            key={t.id}
                            onClick={() => openTemplate(t.id)}
                            className={`w-full text-left px-5 py-3 border-b border-border hover:bg-muted ${selectedTpl?.id === t.id ? "bg-blue-50" : ""}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-[10px]">{t.category}</Badge>
                                <span className="text-[10px] text-muted-foreground">{t.stepCount} steps</span>
                            </div>
                            <div className="text-sm font-medium text-foreground">{t.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</div>
                            <div className="text-[10px] text-muted-foreground mt-1">{t.jurisdictions.join(", ")}</div>
                        </button>
                    ))}
                    {view === "runs" && runs.map(r => {
                        const tpl = templates.find(t => t.id === r.flowId);
                        return (
                            <button
                                key={r.id}
                                onClick={() => openRun(r.id)}
                                className={`w-full text-left px-5 py-3 border-b border-border hover:bg-muted ${selectedRun?.run.id === r.id ? "bg-blue-50" : ""}`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLE[r.status]}`}>
                                        {r.status}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        step {r.stepHistory.filter(s => s.completedAt).length}/{tpl?.stepCount ?? "?"}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-foreground">{tpl?.title ?? r.flowId}</div>
                                <div className="text-[10px] text-muted-foreground mt-1">started {new Date(r.createdAt).toLocaleString()}</div>
                            </button>
                        );
                    })}
                    {view === "runs" && !loading && runs.length === 0 && (
                        <div className="p-6 text-sm text-muted-foreground">no runs yet — pick a template from Library and start one.</div>
                    )}
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 overflow-y-auto">
                {view === "library" && selectedTpl && (
                    <TemplateView template={selectedTpl} onStart={() => startRun(selectedTpl.id)} />
                )}
                {view === "library" && !selectedTpl && (
                    <div className="p-12 text-sm text-muted-foreground">Select a template to view steps and start a run.</div>
                )}
                {view === "runs" && selectedRun && (
                    <RunView
                        run={selectedRun.run}
                        template={selectedRun.template}
                        onCompleteStep={(note) => completeStep(selectedRun.run.id, note)}
                        onPause={() => runAction(selectedRun.run.id, "pause")}
                        onResume={() => runAction(selectedRun.run.id, "resume")}
                        onAbandon={() => runAction(selectedRun.run.id, "abandon")}
                    />
                )}
                {view === "runs" && !selectedRun && (
                    <div className="p-12 text-sm text-muted-foreground">Select a run to view progress.</div>
                )}
            </div>
        </div>
    );
}

function TemplateView({ template, onStart }: { template: FlowTemplate; onStart: () => void }) {
    return (
        <div className="p-8 max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary">{template.category}</Badge>
                {template.estimatedDuration && (
                    <span className="text-xs text-muted-foreground">~ {template.estimatedDuration}</span>
                )}
            </div>
            <h1 className="text-2xl font-semibold mb-2">{template.title}</h1>
            <p className="text-sm text-foreground/80 mb-4">{template.description}</p>
            <div className="text-xs text-muted-foreground mb-6">Jurisdictions: {template.jurisdictions.join(", ")}</div>

            <Button onClick={onStart} className="mb-6">
                <Play className="w-3.5 h-3.5 mr-1" />
                Start a run
            </Button>

            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Steps ({template.steps.length})</h2>
            <div className="space-y-2">
                {template.steps.map((s, idx) => (
                    <div key={s.id} className="border border-border rounded-lg p-4 bg-card">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted text-foreground/80 text-xs font-semibold flex items-center justify-center">
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-foreground">{s.title}</div>
                                <div className="text-sm text-muted-foreground mt-1">{s.description}</div>
                                <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                                    {s.skills?.map(sk => (
                                        <span key={sk} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">skill: {sk}</span>
                                    ))}
                                    {s.tools?.map(t => (
                                        <span key={t} className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">tool: {t}</span>
                                    ))}
                                    {s.requiresReview && (
                                        <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">human review</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RunView({
    run, template,
    onCompleteStep, onPause, onResume, onAbandon,
}: {
    run: FlowRun;
    template: FlowTemplate;
    onCompleteStep: (note?: string) => void;
    onPause: () => void;
    onResume: () => void;
    onAbandon: () => void;
}) {
    const [note, setNote] = useState("");

    return (
        <div className="p-8 max-w-3xl">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">{template.category}</Badge>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_STYLE[run.status]}`}>
                        {run.status}
                    </span>
                </div>
                <div className="flex gap-2">
                    {run.status === "active" && (
                        <Button variant="outline" size="sm" onClick={onPause}>
                            <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                        </Button>
                    )}
                    {run.status === "paused" && (
                        <Button variant="outline" size="sm" onClick={onResume}>
                            <Play className="w-3.5 h-3.5 mr-1" /> Resume
                        </Button>
                    )}
                    {run.status !== "completed" && run.status !== "abandoned" && (
                        <Button variant="ghost" size="sm" onClick={onAbandon} className="text-red-600">
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Abandon
                        </Button>
                    )}
                </div>
            </div>
            <h1 className="text-2xl font-semibold mb-2">{template.title}</h1>
            <div className="text-xs text-muted-foreground mb-6">Run {run.id.slice(0, 8)} · started {new Date(run.createdAt).toLocaleString()}</div>

            <div className="space-y-3">
                {template.steps.map((s, idx) => {
                    const history = run.stepHistory.find(h => h.stepId === s.id);
                    const completed = !!history?.completedAt;
                    const current = run.currentStepId === s.id;
                    const future = !history && !completed;

                    return (
                        <div
                            key={s.id}
                            className={`border rounded-lg p-4 ${completed ? "bg-emerald-50/30 border-emerald-200" : current ? "bg-blue-50 border-blue-300 shadow-sm" : "bg-card border-border opacity-70"}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    {completed ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    ) : current ? (
                                        <AlertCircle className="w-5 h-5 text-blue-600" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground font-mono">step {idx + 1}</span>
                                        <span className="font-medium text-foreground">{s.title}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">{s.description}</div>
                                    <div className="flex flex-wrap gap-1 mt-2 text-[10px]">
                                        {s.skills?.map(sk => (
                                            <span key={sk} className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">skill: {sk}</span>
                                        ))}
                                        {s.tools?.map(t => (
                                            <span key={t} className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">tool: {t}</span>
                                        ))}
                                        {s.requiresReview && (
                                            <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">human review</span>
                                        )}
                                    </div>
                                    {history?.note && (
                                        <div className="mt-2 text-xs italic text-muted-foreground bg-card border border-border rounded p-2">
                                            note: {history.note}
                                        </div>
                                    )}
                                    {current && run.status === "active" && (
                                        <div className="mt-3 flex gap-2">
                                            <input
                                                type="text"
                                                value={note}
                                                onChange={e => setNote(e.target.value)}
                                                placeholder="note (optional)"
                                                className="flex-1 border border-border rounded px-2 py-1 text-xs"
                                            />
                                            <Button size="sm" onClick={() => { onCompleteStep(note || undefined); setNote(""); }}>
                                                Complete step
                                            </Button>
                                        </div>
                                    )}
                                    {completed && history?.completedAt && (
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                            completed {new Date(history.completedAt).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-2 py-0.5 rounded-full text-xs border ${active ? "bg-foreground text-white border-foreground" : "bg-card text-foreground/80 border-border hover:bg-muted"}`}
        >
            {children}
        </button>
    );
}
