"use client";

import { useState } from "react";
import { Repeat, Plus, Play, Pause, Clock, Mail, Slack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// SCAFFOLD: ported from haqq-prototype `renderRoutines`.
// Recurring AI tasks — daily digest, weekly newsletter, alerts, regulatory bulletins, etc.

interface Routine {
    id: string;
    title: string;
    description: string;
    schedule: string;
    enabled: boolean;
    lastRun?: string;
    nextRun?: string;
    output: "email" | "slack" | "in-app";
    icon: "digest" | "alert" | "newsletter" | "report";
}

const ROUTINES: Routine[] = [
    { id: "r1", title: "Daily Regulatory Digest — MENA",
      description: "Summary of new gazette entries, SDAIA / SAMA / CBUAE / BDL guidance, regulator bulletins.",
      schedule: "Weekdays · 8:00 AM Beirut",
      enabled: true, lastRun: "today, 8:00 AM", nextRun: "tomorrow, 8:00 AM",
      output: "email", icon: "digest" },
    { id: "r2", title: "Friday Newsletter — In-house counsel",
      description: "Weekly status synthesis of all matters + commercial team highlights (Mark Pike pattern).",
      schedule: "Fridays · 4:00 PM",
      enabled: true, lastRun: "Fri 4:00 PM", nextRun: "this Fri, 4:00 PM",
      output: "email", icon: "newsletter" },
    { id: "r3", title: "Approaching deadline alerts",
      description: "Surface contracts / litigation deadlines within 7 days.",
      schedule: "Daily · 9:00 AM",
      enabled: true, lastRun: "today, 9:00 AM", nextRun: "tomorrow, 9:00 AM",
      output: "slack", icon: "alert" },
    { id: "r4", title: "Weekly Skills Library QA",
      description: "Run benchmark dataset (eval.dataset.*) against current model + report regressions.",
      schedule: "Sundays · 11:00 PM",
      enabled: true, lastRun: "Sun 11:00 PM", nextRun: "this Sun, 11:00 PM",
      output: "in-app", icon: "report" },
    { id: "r5", title: "Monthly competitor digest",
      description: "Track Harvey / Legora / CoCounsel updates, blog posts, pricing changes.",
      schedule: "1st of month · 9:00 AM",
      enabled: false, lastRun: "Apr 1", nextRun: "—",
      output: "email", icon: "newsletter" },
    { id: "r6", title: "Matter-aging alerts",
      description: "Flag matters inactive >30 days; recommend status update to client.",
      schedule: "Mondays · 10:00 AM",
      enabled: false, lastRun: "—", nextRun: "—",
      output: "slack", icon: "alert" },
];

const ICONS = {
    digest: Repeat,
    alert: Clock,
    newsletter: Mail,
    report: Repeat,
};

const OUTPUT_ICONS = {
    email: Mail,
    slack: Slack,
    "in-app": Repeat,
};

export default function RoutinesPage() {
    const [routines, setRoutines] = useState(ROUTINES);
    const [showNew, setShowNew] = useState(false);

    function toggle(id: string) {
        setRoutines(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    }

    return (
        <div className="max-w-5xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Repeat className="w-5 h-5" />
                <h1 className="text-lg font-semibold">Routines</h1>
                <Badge variant="secondary">{routines.filter(r => r.enabled).length} active</Badge>
                <Button size="sm" className="ml-auto h-7 text-xs" onClick={() => setShowNew(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> New routine
                </Button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
                Recurring AI tasks: digests, alerts, newsletters, scheduled reports.
            </p>

            <div className="grid grid-cols-2 gap-4">
                {routines.map(r => {
                    const Icon = ICONS[r.icon];
                    const OutIcon = OUTPUT_ICONS[r.output];
                    return (
                        <div key={r.id} className={`border rounded-lg p-4 ${r.enabled ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-75"}`}>
                            <div className="flex items-start gap-3 mb-2">
                                <Icon className="w-5 h-5 text-gray-700 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{r.title}</div>
                                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</div>
                                </div>
                                <button
                                    onClick={() => toggle(r.id)}
                                    className={`p-1.5 rounded text-xs ${r.enabled ? "text-green-700 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                                    title={r.enabled ? "Pause" : "Activate"}
                                >
                                    {r.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                    <Clock className="w-3 h-3" />
                                    <span>{r.schedule}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                    <OutIcon className="w-3 h-3" />
                                    <span>{r.output}</span>
                                </div>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                                <span>last: {r.lastRun ?? "—"}</span>
                                <span>next: {r.nextRun ?? "—"}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showNew && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowNew(false)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 w-[480px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
                        <h2 className="font-semibold text-base mb-4">New routine</h2>
                        <p className="text-xs text-gray-600 mb-4">
                            <strong>Scaffold:</strong> create-routine flow not wired. Configure schedule, prompt, output channel, and credit budget when ready.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
                            <Button size="sm" disabled>Create</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-10 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-900">
                <strong>Scaffold:</strong> toggles work in-memory only. Backend persistence + scheduling (cron-style runner) is next-session work.
            </div>
        </div>
    );
}
