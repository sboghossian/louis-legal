"use client";

/**
 * InitialView — the assistant's empty-state surface that doubles as the
 * Home dashboard.
 *
 * Layout:
 *   1) Animated Louis mark + "Hi, {name}"
 *   2) ChatInput composer (the entry point to the assistant)
 *   3) Suggested prompts (six comfort-UI starters)
 *   4) Dashboard widgets: Continue (recent chats) · Projects · Library
 *
 * The dashboard widgets are silent on failure — if the user is offline
 * or the backend is asleep, the widget row just doesn't render. The
 * composer is always interactive.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    FolderOpen,
    MessageSquare,
    BookMarked,
    Rss,
    ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLocale } from "@/contexts/LocaleContext";
import { LouisIcon } from "@/components/chat/louis-icon";
import { ChatInput } from "./ChatInput";
import { SelectAssistantProjectModal } from "./SelectAssistantProjectModal";
import type { LouisMessage } from "../shared/types";
import { listChats, listProjects } from "@/app/lib/louisApi";
import type {
    LouisChat,
    LouisProject,
} from "@/app/components/shared/types";

interface InitialViewProps {
    onSubmit: (message: LouisMessage) => void;
}

const ICON_SIZE = 35;
const GAP = 16; // gap-4 = 1rem = 16px

function relativeTime(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso).getTime();
    if (!Number.isFinite(d)) return "";
    const diff = Math.max(0, Date.now() - d) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)}m`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h`;
    return `${Math.round(diff / 86400)}d`;
}

export function InitialView({ onSubmit }: InitialViewProps) {
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const { t } = useLocale();
    const router = useRouter();
    const [loaded, setLoaded] = useState(false);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [iconOffset, setIconOffset] = useState(0);
    const [textOffset, setTextOffset] = useState(0);
    const textRef = useRef<HTMLHeadingElement>(null);

    const [recentChats, setRecentChats] = useState<LouisChat[]>([]);
    const [projects, setProjects] = useState<LouisProject[]>([]);

    const username =
        profile?.displayName?.trim() || user?.email?.split("@")[0] || "there";

    useLayoutEffect(() => {
        if (!profile || !textRef.current) return;
        const h1Width = textRef.current.offsetWidth;
        setIconOffset((h1Width + GAP) / 2);
        setTextOffset((ICON_SIZE + GAP) / 2);
    }, [profile]);

    useEffect(() => {
        if (!iconOffset) return;
        const t = setTimeout(() => setLoaded(true), 100);
        return () => clearTimeout(t);
    }, [iconOffset]);

    // Dashboard widgets — silent on failure.
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            try {
                const [chats, ps] = await Promise.all([
                    listChats(),
                    listProjects(),
                ]);
                if (cancelled) return;
                setRecentChats((chats ?? []).slice(0, 4));
                setProjects((ps ?? []).slice(0, 4));
            } catch {
                /* offline or unauth — leave widgets empty */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user]);

    return (
        <div className="flex flex-col h-full w-full overflow-y-auto">
            <div className="flex flex-col items-center w-full px-6 pt-16 pb-10">
                <div className="flex-col items-center w-full max-w-4xl relative px-0 xl:px-8">
                    {/* Hi + Louis mark */}
                    <div className="mb-10 relative flex items-center justify-center h-10">
                        <div
                            className="absolute h-[35px]"
                            style={{
                                left: "50%",
                                transform: loaded
                                    ? `translateX(calc(-50% - ${iconOffset}px))`
                                    : "translateX(-50%)",
                                transition:
                                    "transform 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                            }}
                        >
                            <LouisIcon size={ICON_SIZE} />
                        </div>
                        <h1
                            ref={textRef}
                            className="absolute text-4xl font-serif font-light text-foreground whitespace-nowrap"
                            style={{
                                left: "50%",
                                transform: loaded
                                    ? `translateX(calc(-50% + ${textOffset}px))`
                                    : "translateX(-50%)",
                                opacity: loaded ? 1 : 0,
                                transition:
                                    "transform 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 800ms ease-in-out 300ms",
                            }}
                        >
                            {t("assistant.hi_named", { name: username })}
                        </h1>
                    </div>

                    {/* Composer */}
                    <ChatInput
                        onSubmit={onSubmit}
                        onCancel={() => {}}
                        isLoading={false}
                        onProjectsClick={() => setProjectModalOpen(true)}
                    />

                    {/* Quick prompts */}
                    <div className="mt-6">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-center mb-3">
                            {t("assistant.try_one_of_these")}
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                            {[
                                t("assistant.suggest.nda"),
                                t("assistant.suggest.review_msa"),
                                t("assistant.suggest.compare"),
                                t("assistant.suggest.eos"),
                                t("assistant.suggest.saudi_labor"),
                                t("assistant.suggest.lease"),
                            ].map((p) => (
                                <button
                                    key={p}
                                    onClick={() =>
                                        onSubmit({ role: "user", content: p })
                                    }
                                    className="px-3 py-1.5 text-xs bg-muted hover:bg-muted text-foreground/80 rounded-full border border-border transition-colors"
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard widget rows */}
            <div className="w-full max-w-5xl mx-auto px-6 pb-8 space-y-6">
                {/* Continue (recent chats) */}
                {recentChats.length > 0 && (
                    <WidgetRow
                        title={t("assistant.row.continue")}
                        actionLabel={t("assistant.row.all_chats")}
                        onAction={() => router.push("/all-chats")}
                    >
                        {recentChats.map((c) => (
                            <button
                                key={c.id}
                                onClick={() =>
                                    router.push(`/assistant/chat/${c.id}`)
                                }
                                className="flex-1 min-w-[220px] max-w-[280px] text-left border border-border rounded-xl bg-card p-3 hover:border-border hover:shadow-sm transition"
                            >
                                <MessageSquare className="w-4 h-4 text-muted-foreground mb-2" />
                                <div className="font-medium text-sm text-foreground line-clamp-2">
                                    {c.title || t("common.untitled_chat")}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1">
                                    {relativeTime(c.created_at)}
                                </div>
                            </button>
                        ))}
                    </WidgetRow>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                    <WidgetRow
                        title={t("assistant.row.projects")}
                        actionLabel={t("assistant.row.all_projects")}
                        onAction={() => router.push("/projects")}
                    >
                        {projects.map((p) => (
                            <button
                                key={p.id}
                                onClick={() =>
                                    router.push(`/projects/${p.id}/assistant`)
                                }
                                className="flex-1 min-w-[220px] max-w-[280px] text-left border border-border rounded-xl bg-card p-3 hover:border-border hover:shadow-sm transition"
                            >
                                <FolderOpen className="w-4 h-4 text-amber-700 mb-2" />
                                <div className="font-medium text-sm text-foreground line-clamp-2">
                                    {p.name}
                                </div>
                                {p.cm_number && (
                                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                                        {p.cm_number}
                                    </div>
                                )}
                            </button>
                        ))}
                    </WidgetRow>
                )}

                {/* Library shortcuts */}
                <WidgetRow title={t("assistant.row.library")}>
                    <ShortcutCard
                        icon={BookMarked}
                        title={t("assistant.shortcut.prompts.title")}
                        sub={t("assistant.shortcut.prompts.sub")}
                        href="/prompt-library"
                    />
                    <ShortcutCard
                        icon={Rss}
                        title={t("assistant.shortcut.feed.title")}
                        sub={t("assistant.shortcut.feed.sub")}
                        href="/feed"
                    />
                    <ShortcutCard
                        icon={FolderOpen}
                        title={t("assistant.shortcut.drafting.title")}
                        sub={t("assistant.shortcut.drafting.sub")}
                        href="/drafting-board"
                    />
                </WidgetRow>

                <div className="text-center">
                    <p className="text-xs text-muted-foreground mt-4">
                        {t("assistant.disclaimer")}
                    </p>
                </div>
            </div>

            <SelectAssistantProjectModal
                open={projectModalOpen}
                onClose={() => setProjectModalOpen(false)}
            />
        </div>
    );
}

function WidgetRow({
    title,
    actionLabel,
    onAction,
    children,
}: {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
    children: React.ReactNode;
}) {
    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    {title}
                </h2>
                {actionLabel && onAction && (
                    <button
                        type="button"
                        onClick={onAction}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        {actionLabel}
                    </button>
                )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                {children}
            </div>
        </section>
    );
}

function ShortcutCard({
    icon: Icon,
    title,
    sub,
    href,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    sub: string;
    href: string;
}) {
    const router = useRouter();
    return (
        <button
            onClick={() => router.push(href)}
            className="flex-1 min-w-[220px] max-w-[280px] text-left border border-border rounded-xl bg-card p-3 hover:border-border hover:shadow-sm transition group"
        >
            <div className="flex items-center justify-between mb-2">
                <Icon className="w-4 h-4 text-amber-700" />
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition" />
            </div>
            <div className="font-medium text-sm text-foreground">{title}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
        </button>
    );
}
