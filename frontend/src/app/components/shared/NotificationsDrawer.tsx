"use client";

import { useState, useEffect } from "react";
import { Bell, X, Clock, AlertCircle, MessageSquare, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// SCAFFOLD: ported from haqq-prototype `renderNotifications`. In-memory fixture for now.

interface Notification {
    id: string;
    title: string;
    body: string;
    when: string;
    read: boolean;
    kind: "deadline" | "comment" | "doc" | "skill" | "alert";
    href?: string;
}

const FIXTURE: Notification[] = [
    { id: "n1", title: "Deadline approaching",   body: "Acme x Globex MSA closing on May 28 — 3 days",      when: "10m ago", read: false, kind: "deadline", href: "/doc-workspace?docId=demo" },
    { id: "n2", title: "New comment from Lazar", body: "\"Push on 24-month liability cap — Acme has leverage…\"", when: "2h ago",  read: false, kind: "comment",  href: "/doc-workspace?docId=demo" },
    { id: "n3", title: "Doc workspace ready",    body: "Acme MSA has been ingested and is ready for review",  when: "yesterday", read: false, kind: "doc",      href: "/doc-workspace?docId=demo" },
    { id: "n4", title: "New skill: SHA drafted", body: "draft.shareholders-agreement promoted from stub",      when: "2d ago",  read: true,  kind: "skill",    href: "/skills" },
    { id: "n5", title: "Daily digest sent",       body: "MENA regulatory bulletins delivered via email",        when: "3d ago",  read: true,  kind: "alert",    href: "/routines" },
];

const ICONS = {
    deadline: Clock,
    comment: MessageSquare,
    doc: FileText,
    skill: Sparkles,
    alert: AlertCircle,
};

interface Props {
    open: boolean;
    onClose: () => void;
}

export function NotificationsDrawer({ open, onClose }: Props) {
    const [items, setItems] = useState<Notification[]>(FIXTURE);

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        if (open) window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [open, onClose]);

    if (!open) return null;
    const unreadCount = items.filter(n => !n.read).length;

    function markAllRead() {
        setItems(prev => prev.map(n => ({ ...n, read: true })));
    }

    function open_(n: Notification) {
        setItems(prev => prev.map(p => p.id === n.id ? { ...p, read: true } : p));
        if (n.href) window.location.href = n.href;
    }

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/20" onClick={onClose} />
            <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-white shadow-xl flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                    <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={markAllRead}>Mark all read</Button>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {items.map(n => {
                        const Icon = ICONS[n.kind];
                        return (
                            <button
                                key={n.id}
                                onClick={() => open_(n)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 flex items-start gap-3 ${!n.read ? "bg-blue-50/40" : ""}`}
                            >
                                <div className="relative">
                                    <Icon className="w-4 h-4 text-gray-600 mt-0.5" />
                                    {!n.read && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm">{n.title}</div>
                                    <div className="text-xs text-gray-600 line-clamp-2">{n.body}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{n.when}</div>
                                </div>
                            </button>
                        );
                    })}
                    {!items.length && <div className="p-8 text-center text-sm text-gray-500">No notifications</div>}
                </div>
                <div className="px-4 py-2 border-t border-gray-200 text-[10px] text-amber-700 bg-amber-50">
                    Scaffold: fixture data. Backend wire-up (notifications table + push channel) next-session.
                </div>
            </div>
        </div>
    );
}
