"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen, ChevronDown } from "lucide-react";
import { HeaderSearchBtn } from "@/app/components/shared/HeaderSearchBtn";
import { listProjects, updateProject, deleteProject } from "@/app/lib/louisApi";
import { OwnerOnlyModal } from "@/app/components/shared/OwnerOnlyModal";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import type { LouisProject } from "@/app/components/shared/types";
import { NewProjectModal } from "./NewProjectModal";
import { ToolbarTabs } from "@/app/components/shared/ToolbarTabs";
import { RowActions } from "@/app/components/shared/RowActions";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

type Tab = "all" | "mine" | "shared-with-me";

const CHECK_W = "w-8 shrink-0";
const NAME_COL_W = "w-[300px] shrink-0";

export function ProjectsOverview() {
    const [projects, setProjects] = useState<LouisProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("all");
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [cmEditingId, setCmEditingId] = useState<string | null>(null);
    const [cmValue, setCmValue] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [actionsOpen, setActionsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [ownerOnlyAction, setOwnerOnlyAction] = useState<string | null>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useLocale();

    useEffect(() => {
        listProjects()
            .then(setProjects)
            .catch(() => setProjects([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        setSelectedIds([]);
    }, [activeTab]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                actionsRef.current &&
                !actionsRef.current.contains(e.target as Node)
            )
                setActionsOpen(false);
        }
        if (actionsOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [actionsOpen]);

    const q = search.toLowerCase();
    const filtered = (
        activeTab === "all"
            ? projects
            : activeTab === "mine"
              ? projects.filter((p) => p.is_owner ?? p.user_id === user?.id)
              : projects.filter((p) => !(p.is_owner ?? p.user_id === user?.id))
    ).filter(
        (p) =>
            !q ||
            p.name.toLowerCase().includes(q) ||
            (p.cm_number ?? "").toLowerCase().includes(q),
    );

    const allSelected =
        filtered.length > 0 &&
        filtered.every((p) => selectedIds.includes(p.id));
    const someSelected =
        !allSelected && filtered.some((p) => selectedIds.includes(p.id));

    function toggleAll() {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map((p) => p.id));
        }
    }

    function toggleOne(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    const tabs: { id: Tab; label: string }[] = [
        { id: "all", label: t("projects.tab.all") },
        { id: "mine", label: t("projects.tab.mine") },
        { id: "shared-with-me", label: t("projects.tab.shared") },
    ];

    async function handleRenameSubmit(projectId: string) {
        const trimmed = renameValue.trim();
        setRenamingId(null);
        if (!trimmed) return;
        setProjects((prev) =>
            prev.map((p) => (p.id === projectId ? { ...p, name: trimmed } : p)),
        );
        await updateProject(projectId, { name: trimmed });
    }

    async function handleCmSubmit(projectId: string) {
        const trimmed = cmValue.trim();
        setCmEditingId(null);
        setProjects((prev) =>
            prev.map((p) =>
                p.id === projectId ? { ...p, cm_number: trimmed || null } : p,
            ),
        );
        await updateProject(projectId, { cm_number: trimmed || undefined });
    }

    async function handleDeleteSelected() {
        const ids = [...selectedIds];
        setActionsOpen(false);
        // Only the project owner can delete; the per-row delete is hidden
        // for shared projects but the bulk action can still pick them up
        // if a user toggled them across tabs. Filter and warn.
        const owned = ids.filter((id) => {
            const p = projects.find((pp) => pp.id === id);
            return !p || (p.is_owner ?? p.user_id === user?.id);
        });
        const blocked = ids.length - owned.length;
        setSelectedIds([]);
        await Promise.all(owned.map((id) => deleteProject(id).catch(() => {})));
        setProjects((prev) => prev.filter((p) => !owned.includes(p.id)));
        if (blocked > 0) {
            setOwnerOnlyAction(
                t("projects.owner_only.delete", { count: blocked }),
            );
        }
    }

    const toolbarActions = (
        <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
                <div ref={actionsRef} className="relative">
                    <button
                        onClick={() => setActionsOpen((v) => !v)}
                        className="flex items-center gap-1 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
                    >
                        {t("projects.actions")}
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    {actionsOpen && (
                        <div className="absolute top-full right-0 mt-1 w-36 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
                            <button
                                onClick={handleDeleteSelected}
                                className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 transition-colors"
                            >
                                {t("action.delete")}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex-1 overflow-y-auto bg-card">
            {/* Page header */}
            <div className="flex items-center justify-between px-8 py-4">
                <h1 className="text-2xl font-medium font-serif text-foreground">
                    {t("projects.title")}
                </h1>
                <div className="flex items-center gap-2">
                    <HeaderSearchBtn
                        value={search}
                        onChange={setSearch}
                        placeholder={t("projects.search_placeholder")}
                    />
                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <ToolbarTabs
                tabs={tabs}
                active={activeTab}
                onChange={setActiveTab}
                actions={toolbarActions}
            />

            {/* Table (md+) */}
            <div className="hidden md:block w-full overflow-x-auto">
                <div className="min-w-max">
                {/* Column headers */}
                <div className="flex items-center h-8 pr-8 border-b border-border text-xs text-muted-foreground font-medium select-none">
                    <div className={`sticky left-0 z-[60] ${CHECK_W} relative bg-card flex items-center justify-center self-stretch before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-card`}>
                        {!loading && (
                            <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => {
                                    if (el) el.indeterminate = someSelected;
                                }}
                                onChange={toggleAll}
                                className="h-2.5 w-2.5 rounded border-border cursor-pointer accent-black"
                            />
                        )}
                    </div>
                    <div className={`sticky left-8 z-[60] ${NAME_COL_W} bg-card pl-2 text-left`}>
                        {t("projects.col.name")}
                    </div>
                    <div className="ml-auto w-32 shrink-0 text-left">{t("projects.col.cm")}</div>
                    <div className="w-24 shrink-0 text-left">{t("projects.col.files")}</div>
                    <div className="w-24 shrink-0 text-left">{t("projects.col.chats")}</div>
                    <div className="w-36 shrink-0 text-left">
                        {t("projects.col.reviews")}
                    </div>
                    <div className="w-32 shrink-0 text-left">{t("projects.col.created")}</div>
                    <div className="w-8 shrink-0" />
                </div>

                {loading ? (
                    <div>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="flex items-center h-10 pr-8 border-b border-border"
                            >
                                <div className="w-8 shrink-0" />
                                <div className="flex-1 min-w-0 pl-3 pr-4">
                                    <div className="h-3.5 w-48 rounded bg-muted animate-pulse" />
                                </div>
                                <div className="w-32 shrink-0">
                                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                                </div>
                                <div className="w-24 shrink-0">
                                    <div className="h-3 w-8 rounded bg-muted animate-pulse" />
                                </div>
                                <div className="w-24 shrink-0">
                                    <div className="h-3 w-8 rounded bg-muted animate-pulse" />
                                </div>
                                <div className="w-36 shrink-0">
                                    <div className="h-3 w-8 rounded bg-muted animate-pulse" />
                                </div>
                                <div className="w-32 shrink-0">
                                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                                </div>
                                <div className="w-8 shrink-0" />
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-start py-24 w-full max-w-xs mx-auto">
                        {activeTab === "all" || activeTab === "mine" ? (
                            <>
                                <FolderOpen className="h-8 w-8 text-muted-foreground mb-4" />
                                <p className="text-2xl font-medium font-serif text-foreground">
                                    {t("projects.empty.title")}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                                    {t("projects.empty.intro")}
                                </p>
                                <button
                                    onClick={() => setModalOpen(true)}
                                    className="mt-4 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-white hover:bg-foreground transition-colors shadow-md"
                                >
                                    {t("action.create_new")}
                                </button>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t("projects.empty.no_filtered", { tab: activeTab })}
                            </p>
                        )}
                    </div>
                ) : (
                    <div>
                        {filtered.map((project) => {
                            const rowBg = selectedIds.includes(project.id)
                                ? "bg-muted"
                                : "bg-card";
                            return (
                            <div
                                key={project.id}
                                onClick={() => {
                                    if (renamingId === project.id) return;
                                    router.push(`/projects/${project.id}`);
                                }}
                                className="group flex items-center h-10 pr-8 border-b border-border hover:bg-muted cursor-pointer transition-colors"
                            >
                                <div
                                    className={`sticky left-0 z-[60] ${CHECK_W} p-2 flex items-center justify-center ${rowBg} group-hover:bg-muted`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(
                                            project.id,
                                        )}
                                        onChange={() => toggleOne(project.id)}
                                        className="h-2.5 w-2.5 rounded border-border cursor-pointer accent-black"
                                    />
                                </div>

                                {/* Project Name */}
                                <div className={`sticky left-8 z-[60] ${NAME_COL_W} p-2 ${rowBg} group-hover:bg-muted`}>
                                    {renamingId === project.id ? (
                                        <input
                                            autoFocus
                                            value={renameValue}
                                            onChange={(e) =>
                                                setRenameValue(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    handleRenameSubmit(
                                                        project.id,
                                                    );
                                                if (e.key === "Escape")
                                                    setRenamingId(null);
                                            }}
                                            onBlur={() =>
                                                handleRenameSubmit(project.id)
                                            }
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full text-sm text-foreground bg-transparent outline-none"
                                        />
                                    ) : (
                                        <span className="text-sm text-foreground truncate block">
                                            {project.name}
                                        </span>
                                    )}
                                </div>

                                <div
                                    className="ml-auto w-32 shrink-0 text-sm text-muted-foreground truncate"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {cmEditingId === project.id ? (
                                        <input
                                            autoFocus
                                            value={cmValue}
                                            onChange={(e) =>
                                                setCmValue(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter")
                                                    handleCmSubmit(project.id);
                                                if (e.key === "Escape")
                                                    setCmEditingId(null);
                                            }}
                                            onBlur={() =>
                                                handleCmSubmit(project.id)
                                            }
                                            placeholder={t("projects.cm_placeholder")}
                                            className="w-full text-sm text-foreground bg-transparent outline-none"
                                        />
                                    ) : (
                                        (project.cm_number ?? (
                                            <span className="text-muted-foreground">
                                                —
                                            </span>
                                        ))
                                    )}
                                </div>
                                <div className="w-24 shrink-0 text-sm text-muted-foreground truncate">
                                    {project.document_count ?? 0}
                                </div>
                                <div className="w-24 shrink-0 text-sm text-muted-foreground truncate">
                                    {project.chat_count ?? 0}
                                </div>
                                <div className="w-36 shrink-0 text-sm text-muted-foreground truncate">
                                    {project.review_count ?? 0}
                                </div>
                                <div className="w-32 shrink-0 text-sm text-muted-foreground truncate">
                                    {formatDate(project.created_at)}
                                </div>

                                <div
                                    className="w-8 shrink-0 flex justify-end"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {(project.is_owner ??
                                        project.user_id === user?.id) && (
                                        <RowActions
                                            onRename={() => {
                                                setRenameValue(project.name);
                                                setRenamingId(project.id);
                                            }}
                                            onUpdateCmNumber={() => {
                                                setCmValue(
                                                    project.cm_number ?? "",
                                                );
                                                setCmEditingId(project.id);
                                            }}
                                            onDelete={async () => {
                                                await deleteProject(project.id);
                                                setProjects((prev) =>
                                                    prev.filter(
                                                        (p) =>
                                                            p.id !== project.id,
                                                    ),
                                                );
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
            </div>

            {/* Card list (mobile, < md) */}
            <div className="md:hidden px-4 py-2 space-y-2">
                {loading ? (
                    [1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="rounded-lg border border-border bg-card p-3"
                        >
                            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                            <div className="mt-2 h-3 w-24 rounded bg-muted animate-pulse" />
                            <div className="mt-2 h-3 w-32 rounded bg-muted animate-pulse" />
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-start py-16 w-full max-w-xs mx-auto">
                        {activeTab === "all" || activeTab === "mine" ? (
                            <>
                                <FolderOpen className="h-8 w-8 text-muted-foreground mb-4" />
                                <p className="text-2xl font-medium font-serif text-foreground">
                                    {t("projects.empty.title")}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                                    {t("projects.empty.intro")}
                                </p>
                                <button
                                    onClick={() => setModalOpen(true)}
                                    className="mt-4 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-white hover:bg-foreground transition-colors shadow-md"
                                >
                                    {t("action.create_new")}
                                </button>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {t("projects.empty.no_filtered", { tab: activeTab })}
                            </p>
                        )}
                    </div>
                ) : (
                    filtered.map((project) => {
                        const isOwner =
                            project.is_owner ?? project.user_id === user?.id;
                        return (
                            <button
                                key={project.id}
                                type="button"
                                onClick={() =>
                                    router.push(`/projects/${project.id}`)
                                }
                                className="block w-full text-left rounded-lg border border-border bg-card p-3 hover:bg-muted transition-colors"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="font-serif text-base font-medium text-foreground truncate">
                                        {project.name}
                                    </span>
                                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                        {isOwner ? t("projects.badge.mine") : t("projects.badge.shared")}
                                    </span>
                                </div>
                                {project.cm_number && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        CM {project.cm_number}
                                    </div>
                                )}
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {formatDate(project.created_at)}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    {t("projects.mobile.counts", {
                                        files: project.document_count ?? 0,
                                        chats: project.chat_count ?? 0,
                                        reviews: project.review_count ?? 0,
                                    })}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            <NewProjectModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={(p) => {
                    setProjects((prev) => [p, ...prev]);
                    router.push(`/projects/${p.id}`);
                }}
            />

            <OwnerOnlyModal
                open={!!ownerOnlyAction}
                action={ownerOnlyAction ?? undefined}
                onClose={() => setOwnerOnlyAction(null)}
            />
        </div>
    );
}
