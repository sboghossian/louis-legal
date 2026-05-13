"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, Clock, AlertCircle, MessageSquare, FileText, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthHeader } from "@/app/lib/louisApi";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

// Inbox entry shape mirrors backend/src/routes/inbox.ts
interface InboxEntry {
    id: string;
    kind: "matter-event" | "routine-output" | "deadline" | "system" | "team-invite";
    title: string;
    body?: string;
    severity: "info" | "warning" | "urgent";
    read: boolean;
    createdAt: string;
    link?: string;
}

const ICONS: Record<InboxEntry["kind"], LucideIcon> = {
    "matter-event": FileText,
    "routine-output": Sparkles,
    "deadline": Clock,
    "system": Bell,
    "team-invite": MessageSquare,
};

function relativeTime(iso: string): string {
    try {
        const t = new Date(iso).getTime();
        const diff = Date.now() - t;
        if (diff < 60_000) return "just now";
        if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
        if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
        return `${Math.round(diff / 86_400_000)}d ago`;
    } catch {
        return "";
    }
}

interface Props {
    open: boolean;
    onClose: () => void;
}

export function NotificationsDrawer({ open, onClose }: Props) {
    const [items, setItems] = useState<InboxEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const auth = await getAuthHeader();
            const r = await fetch(`${API_BASE}/api/inbox`, {
                headers: auth,
                cache: "no-store",
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const json = (await r.json()) as { entries?: InboxEntry[] };
            setItems(json.entries ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) refresh();
    }, [open, refresh]);

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        if (open) window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [open, onClose]);

    if (!open) return null;
    const unreadCount = items.filter((n) => !n.read).length;

    async function markAllRead() {
        // Optimistic update so the drawer reflects the action before the
        // server round-trip completes.
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        try {
            const auth = await getAuthHeader();
            await fetch(`${API_BASE}/api/inbox/read-all`, { method: "POST", headers: auth });
        } catch {
            // Rollback isn't worth it — the next refresh will reconcile.
        }
    }

    async function openEntry(n: InboxEntry) {
        setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)));
        try {
            const auth = await getAuthHeader();
            await fetch(`${API_BASE}/api/inbox/${n.id}/read`, { method: "POST", headers: auth });
        } catch {
            /* swallow */
        }
        if (n.link) window.location.href = n.link;
    }

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/20" onClick={onClose} />
            <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-card shadow-xl flex flex-col">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 text-xs"
                        onClick={markAllRead}
                        disabled={unreadCount === 0}
                    >
                        Mark all read
                    </Button>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {loading && items.length === 0 && (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            Loading…
                        </div>
                    )}
                    {!loading && error && (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            Couldn&apos;t load notifications.
                        </div>
                    )}
                    {!loading && !error && items.length === 0 && (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            You&apos;re all caught up.
                        </div>
                    )}
                    {items.map((n) => {
                        // Fall back to Bell if the server ever sends a kind
                        // we don't recognize — keeps the row from crashing.
                        const Icon = ICONS[n.kind] ?? Bell;
                        return (
                            <button
                                key={n.id}
                                onClick={() => openEntry(n)}
                                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted flex items-start gap-3 ${!n.read ? "bg-blue-50/40" : ""}`}
                            >
                                <div className="relative">
                                    <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                                    {!n.read && (
                                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{n.title}</div>
                                    {n.body && (
                                        <div className="text-xs text-muted-foreground line-clamp-2">
                                            {n.body}
                                        </div>
                                    )}
                                    {n.severity === "urgent" && (
                                        <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-red-700">
                                            <AlertCircle className="w-3 h-3" />
                                            Urgent
                                        </div>
                                    )}
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        {relativeTime(n.createdAt)}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
