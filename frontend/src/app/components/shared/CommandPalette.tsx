"use client";

/**
 * Cmd+K command palette — the universal jump-to anywhere in Louis.
 *
 * Sources indexed:
 *   - Every sidebar nav entry (pinned + grouped)
 *   - Recent chats (10 most recent)
 *   - Recent projects (8 most recent)
 *   - Prompt library (50 most recent)
 *   - Customize / Appearance / Account quick actions
 *
 * Keys:
 *   Cmd/Ctrl+K · /       open
 *   ↑ ↓                  navigate
 *   Enter                run / open
 *   Esc                  close
 */

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    Home,
    MessageSquare,
    Inbox,
    FolderOpen,
    Rss,
    MessageSquareDashed,
    Network,
    FileText,
    BookOpen,
    ShieldAlert,
    Quote,
    Calculator,
    Workflow,
    Table2,
    BookMarked,
    Lock,
    Briefcase,
    Building2,
    Repeat,
    SlidersHorizontal,
    Sparkles,
    Library,
    Plug,
    Key,
    Users,
    Settings as SettingsIcon,
    BookOpenCheck,
    Info,
    LogOut,
    Share2,
    Sun,
    LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
    listChats,
    listProjects,
    type FeedTopic,
} from "@/app/lib/louisApi";
import type {
    LouisChat,
    LouisProject,
} from "@/app/components/shared/types";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface PaletteItem {
    id: string;
    label: string;
    sublabel?: string;
    section: string;
    icon: LucideIcon;
    run: () => void;
    keywords?: string[];
}

const STATIC_NAV: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/assistant",       label: "Assistant",       icon: MessageSquare },
    { href: "/feed",            label: "Newsfeed",        icon: Rss },
    { href: "/inbox",           label: "Inbox",           icon: Inbox },
    { href: "/all-chats",       label: "All Chats",       icon: MessageSquareDashed },
    { href: "/projects",        label: "Projects",        icon: FolderOpen },
    { href: "/doc-workspace",   label: "Doc Workspace",   icon: FileText },
    { href: "/drafting-board",  label: "Drafting Board",  icon: Network },
    { href: "/clauses",         label: "Clause Library",  icon: BookOpen },
    { href: "/risk",            label: "Risk Scanner",    icon: ShieldAlert },
    { href: "/citations",       label: "Citations",       icon: Quote },
    { href: "/calculators/eos", label: "EOS Calculator",  icon: Calculator },
    { href: "/legal-flows",     label: "Legal Flows",     icon: Workflow },
    { href: "/tabular-reviews", label: "Tabular Review",  icon: Table2 },
    { href: "/prompt-library",  label: "Prompt Library",  icon: BookMarked },
    { href: "/vault",           label: "Vault",           icon: Lock },
    { href: "/matters",         label: "Matters",         icon: Briefcase },
    { href: "/efirm",           label: "e-Firm",          icon: Building2 },
    { href: "/routines",        label: "Routines",        icon: Repeat },
    { href: "/customize",       label: "Customize",       icon: SlidersHorizontal },
    { href: "/skills",          label: "Skills",          icon: Sparkles },
    { href: "/workflows",       label: "Workflows",       icon: Library },
    { href: "/integrations",    label: "Integrations",    icon: Plug },
    { href: "/settings/api-keys", label: "API Keys",      icon: Key },
    { href: "/settings",        label: "Settings",        icon: SettingsIcon },
    { href: "/team",            label: "Team",            icon: Users },
    { href: "/academy",         label: "Academy",         icon: BookOpenCheck },
    { href: "/referral",        label: "Share Louis",     icon: Share2 },
    { href: "/about",           label: "About",           icon: Info },
];

export function CommandPalette() {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [cursor, setCursor] = useState(0);
    const [chats, setChats] = useState<LouisChat[]>([]);
    const [projects, setProjects] = useState<LouisProject[]>([]);
    const [prompts, setPrompts] = useState<
        { id: string; name: string; template: string }[]
    >([]);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // Global Cmd/Ctrl+K + "/" listener.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const isInput =
                e.target instanceof HTMLElement &&
                ["INPUT", "TEXTAREA"].includes(e.target.tagName);
            if (
                (e.key === "k" || e.key === "K") &&
                (e.metaKey || e.ctrlKey)
            ) {
                e.preventDefault();
                setOpen((v) => !v);
                return;
            }
            if (e.key === "/" && !isInput && !open) {
                e.preventDefault();
                setOpen(true);
                return;
            }
            if (e.key === "Escape" && open) {
                setOpen(false);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    // Focus input when opened; reset query + cursor between sessions.
    useEffect(() => {
        if (open) {
            setQ("");
            setCursor(0);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open]);

    // Lazy-load dynamic sources the first time the palette opens.
    const loadedRef = useRef(false);
    useEffect(() => {
        if (!open || loadedRef.current || !user) return;
        loadedRef.current = true;
        (async () => {
            try {
                const [c, p] = await Promise.all([
                    listChats().catch(() => [] as LouisChat[]),
                    listProjects().catch(() => [] as LouisProject[]),
                ]);
                setChats((c ?? []).slice(0, 10));
                setProjects((p ?? []).slice(0, 8));
            } catch {
                /* offline — skip dynamic sources */
            }
            try {
                const r = await fetch(
                    `${API_BASE}/api/skills/prompt-library`,
                );
                if (r.ok) {
                    const json = (await r.json()) as {
                        entries: {
                            id: string;
                            name: string;
                            template: string;
                        }[];
                    };
                    setPrompts((json.entries ?? []).slice(0, 50));
                }
            } catch {
                /* prompt registry down — skip */
            }
        })();
    }, [open, user]);

    // Build the index every render — cheap (a few hundred entries).
    const items: PaletteItem[] = useMemo(() => {
        const navItems: PaletteItem[] = STATIC_NAV.map((n) => ({
            id: `nav-${n.href}`,
            label: n.label,
            sublabel: n.href,
            section: "Pages",
            icon: n.icon,
            run: () => router.push(n.href),
            keywords: [n.label.toLowerCase(), n.href],
        }));

        const chatItems: PaletteItem[] = chats.map((c) => ({
            id: `chat-${c.id}`,
            label: c.title || "Untitled chat",
            sublabel: "Recent chat",
            section: "Chats",
            icon: MessageSquare,
            run: () => router.push(`/assistant/chat/${c.id}`),
        }));

        const projectItems: PaletteItem[] = projects.map((p) => ({
            id: `project-${p.id}`,
            label: p.name,
            sublabel: p.cm_number ?? "Project",
            section: "Projects",
            icon: FolderOpen,
            run: () => router.push(`/projects/${p.id}/assistant`),
        }));

        const promptItems: PaletteItem[] = prompts.map((p) => ({
            id: `prompt-${p.id}`,
            label: p.name,
            sublabel: "Send to assistant",
            section: "Prompts",
            icon: BookMarked,
            run: () => {
                if (typeof window !== "undefined") {
                    sessionStorage.setItem(
                        "louis.initialPrompt",
                        p.template || p.name,
                    );
                }
                router.push("/assistant");
            },
        }));

        const actions: PaletteItem[] = [
            {
                id: "action-appearance",
                label: "Open Appearance",
                sublabel: "Settings → Appearance",
                section: "Actions",
                icon: Sun,
                run: () => router.push("/settings"),
                keywords: ["theme", "font", "language", "dark", "cream"],
            },
            {
                id: "action-api-keys",
                label: "Set API key",
                sublabel: "Bring your own Claude / Gemini / OpenAI",
                section: "Actions",
                icon: Key,
                run: () => router.push("/settings/api-keys"),
            },
            {
                id: "action-new-project",
                label: "Open Projects",
                sublabel: "New matter folder",
                section: "Actions",
                icon: FolderOpen,
                run: () => router.push("/projects"),
            },
            {
                id: "action-academy",
                label: "Open Academy",
                sublabel: "How Louis works, page by page",
                section: "Actions",
                icon: BookOpenCheck,
                run: () => router.push("/academy"),
            },
            {
                id: "action-signout",
                label: "Sign out",
                sublabel: "End this session",
                section: "Actions",
                icon: LogOut,
                run: async () => {
                    try {
                        await signOut();
                    } catch (e) {
                        console.error(e);
                    }
                    if (typeof window !== "undefined" && user?.id) {
                        try {
                            window.localStorage.removeItem(
                                `louis.onboarded:${user.id}`,
                            );
                        } catch {
                            /* ignore */
                        }
                    }
                    router.push("/login");
                },
            },
        ];

        return [...navItems, ...actions, ...chatItems, ...projectItems, ...promptItems];
    }, [router, chats, projects, prompts, signOut, user]);

    const filtered: PaletteItem[] = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) {
            // No query → show pages + actions + a slice of recent chats/projects.
            return items.filter((i) =>
                ["Pages", "Actions", "Chats", "Projects"].includes(i.section),
            );
        }
        return items
            .map((i) => {
                const hay = (
                    i.label +
                    " " +
                    (i.sublabel ?? "") +
                    " " +
                    (i.keywords ?? []).join(" ")
                ).toLowerCase();
                let score = -1;
                if (hay.includes(needle)) {
                    score = hay.indexOf(needle);
                    if (i.label.toLowerCase().startsWith(needle)) score -= 100;
                }
                return { item: i, score };
            })
            .filter((x) => x.score >= 0)
            .sort((a, b) => a.score - b.score)
            .slice(0, 40)
            .map((x) => x.item);
    }, [items, q]);

    // Group filtered items by section, preserving order.
    const grouped = useMemo(() => {
        const out: { section: string; items: PaletteItem[] }[] = [];
        for (const it of filtered) {
            const last = out[out.length - 1];
            if (last && last.section === it.section) {
                last.items.push(it);
            } else {
                out.push({ section: it.section, items: [it] });
            }
        }
        return out;
    }, [filtered]);

    // Clamp cursor when filtered list changes.
    useEffect(() => {
        if (cursor >= filtered.length) setCursor(Math.max(0, filtered.length - 1));
    }, [filtered.length, cursor]);

    const onListKey = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                const it = filtered[cursor];
                if (it) {
                    it.run();
                    setOpen(false);
                }
            }
        },
        [filtered, cursor],
    );

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
        >
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-xl rounded-2xl bg-white border border-gray-200 shadow-2xl overflow-hidden"
            >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        ref={inputRef}
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setCursor(0);
                        }}
                        onKeyDown={onListKey}
                        placeholder="Jump to a page, chat, project, prompt — or type to search"
                        className="flex-1 outline-none text-sm bg-transparent"
                    />
                    <kbd className="hidden sm:inline-block text-[10px] text-gray-400 font-mono px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200">
                        Esc
                    </kbd>
                </div>

                <div className="max-h-[60vh] overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                            Nothing matches &quot;{q}&quot;.
                        </div>
                    ) : (
                        grouped.map((g) => (
                            <div key={g.section} className="py-1">
                                <div className="px-4 py-1 text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                                    {g.section}
                                </div>
                                {g.items.map((it) => {
                                    const idx = filtered.indexOf(it);
                                    const active = cursor === idx;
                                    const Icon = it.icon;
                                    return (
                                        <button
                                            key={it.id}
                                            type="button"
                                            onMouseEnter={() => setCursor(idx)}
                                            onClick={() => {
                                                it.run();
                                                setOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-2 text-left ${
                                                active
                                                    ? "bg-gray-100"
                                                    : "hover:bg-gray-50"
                                            }`}
                                        >
                                            <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm text-gray-900 truncate">
                                                    {it.label}
                                                </div>
                                                {it.sublabel && (
                                                    <div className="text-[11px] text-gray-500 truncate">
                                                        {it.sublabel}
                                                    </div>
                                                )}
                                            </div>
                                            {active && (
                                                <kbd className="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 rounded bg-white border border-gray-200">
                                                    ↵
                                                </kbd>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-[10px] text-gray-500">
                    <div className="flex items-center gap-3">
                        <span>
                            <kbd className="font-mono">↑</kbd>{" "}
                            <kbd className="font-mono">↓</kbd> navigate
                        </span>
                        <span>
                            <kbd className="font-mono">↵</kbd> open
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 rounded bg-white border border-gray-200">
                            {typeof navigator !== "undefined" &&
                            /mac/i.test(navigator.platform)
                                ? "⌘"
                                : "Ctrl"}
                        </kbd>
                        <kbd className="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 rounded bg-white border border-gray-200">
                            K
                        </kbd>
                    </div>
                </div>
            </div>
        </div>
    );
}

// `FeedTopic` re-export so future consumers can pull it from this module.
export type { FeedTopic };
