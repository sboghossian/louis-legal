"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, FileText, Repeat, Calendar, Sparkles, UserPlus, CreditCard, CheckCheck, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAuthHeader as authHeaders } from "@/app/lib/louisApi";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

type EntryKind = "matter-event" | "routine-output" | "deadline" | "system" | "team-invite" | "billing";

interface InboxEntry {
    id: string;
    kind: EntryKind;
    title: string;
    body?: string;
    matterId?: string;
    routineId?: string;
    severity: "info" | "warning" | "urgent";
    read: boolean;
    createdAt: string;
    link?: string;
}

const KIND_ICONS: Record<EntryKind, typeof FileText> = {
    "matter-event": FileText,
    "routine-output": Repeat,
    deadline: Calendar,
    system: Sparkles,
    "team-invite": UserPlus,
    billing: CreditCard,
};

const SEVERITY_COLORS = {
    info: "border-border bg-card",
    warning: "border-amber-200 bg-amber-50/30",
    urgent: "border-red-200 bg-red-50/30",
};

const SEVERITY_ICONS = {
    info: null,
    warning: AlertTriangle,
    urgent: AlertCircle,
};

function formatTime(iso: string): string {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function InboxPage() {
    const router = useRouter();
    const [entries, setEntries] = useState<InboxEntry[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "unread" | EntryKind>("all");

    async function refresh() {
        setLoading(true);
        try {
            const headers = await authHeaders();
            const r = await fetch(`${API_BASE}/api/inbox`, { headers });
            const j = await r.json();
            setEntries(j.entries ?? []);
            setUnread(j.unread ?? 0);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { refresh(); }, []);

    async function markRead(id: string) {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
        const headers = await authHeaders();
        await fetch(`${API_BASE}/api/inbox/${id}/read`, { method: "POST", headers });
    }

    async function markAllRead() {
        const headers = await authHeaders();
        await fetch(`${API_BASE}/api/inbox/read-all`, { method: "POST", headers });
        refresh();
    }

    function openEntry(entry: InboxEntry) {
        markRead(entry.id);
        if (entry.link) router.push(entry.link);
    }

    const filtered = entries.filter(e => {
        if (filter === "all") return true;
        if (filter === "unread") return !e.read;
        return e.kind === filter;
    });

    const FILTERS: { id: typeof filter; label: string }[] = [
        { id: "all", label: "All" },
        { id: "unread", label: `Unread (${unread})` },
        { id: "matter-event", label: "Matters" },
        { id: "routine-output", label: "Routines" },
        { id: "deadline", label: "Deadlines" },
        { id: "system", label: "System" },
    ];

    return (
        <div className="max-w-4xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Inbox className="w-5 h-5 text-foreground/80" />
                <h1 className="text-2xl font-serif">Inbox</h1>
                <Badge variant="secondary">{entries.length}</Badge>
                {unread > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">{unread} unread</Badge>
                )}
                {unread > 0 && (
                    <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={markAllRead}>
                        <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
                    </Button>
                )}
            </div>
            <p className="text-sm text-muted-foreground mb-6">
                Everything that happened: matter updates, routine outputs, deadlines, team activity, system messages.
            </p>

            <div className="flex flex-wrap gap-1.5 mb-6">
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-2.5 py-1 text-xs rounded-full border ${filter === f.id ? "bg-foreground text-white border-foreground" : "bg-card text-foreground/80 border-border hover:bg-muted"}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

            <div className="space-y-2">
                {filtered.length === 0 && !loading && (
                    <div className="border border-dashed border-border rounded-lg p-12 text-center text-sm text-muted-foreground">
                        {filter === "unread" ? "All caught up." : "Nothing here yet."}
                    </div>
                )}
                {filtered.map(e => {
                    const KindIcon = KIND_ICONS[e.kind] || Sparkles;
                    const SevIcon = SEVERITY_ICONS[e.severity];
                    return (
                        <button
                            key={e.id}
                            onClick={() => openEntry(e)}
                            className={`w-full text-left border rounded-lg p-4 transition hover:border-foreground ${SEVERITY_COLORS[e.severity]} ${!e.read ? "" : "opacity-70"}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="relative flex-shrink-0">
                                    <KindIcon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                    {!e.read && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-medium text-sm">{e.title}</span>
                                        {SevIcon && <SevIcon className={`w-3 h-3 ${e.severity === "urgent" ? "text-red-600" : "text-amber-600"}`} />}
                                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground ml-auto">{e.kind}</span>
                                    </div>
                                    {e.body && <div className="text-xs text-muted-foreground line-clamp-2">{e.body}</div>}
                                    <div className="text-[10px] text-muted-foreground mt-1">{formatTime(e.createdAt)}</div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
