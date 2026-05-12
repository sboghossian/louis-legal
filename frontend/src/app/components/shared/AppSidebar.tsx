"use client";

import { useState, useEffect } from "react";
import {
    PanelLeft,
    MessageSquare,
    FolderOpen,
    Table2,
    Lock,
    Library,
    User,
    ChevronsUpDown,
    ChevronDown,
    Sparkles,
    Network,
    Gift,
    SlidersHorizontal,
    FileText,
    MessageSquareDashed,
    Repeat,
    Briefcase,
    Settings as SettingsIcon,
    Bell,
    BookOpen,
    BookMarked,
    Calculator,
    Quote,
    ShieldAlert,
    Workflow,
    Info,
    BookOpenCheck,
    Plug,
    Key,
    Grid3x3,
    Building2,
    ChevronRight,
    Inbox,
    CreditCard,
    Users,
    Zap,
    LogOut,
    Rss,
    Star,
} from "lucide-react";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useChatHistoryContext } from "@/app/contexts/ChatHistoryContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LouisIcon } from "@/components/chat/louis-icon";
import { LouisMark } from "@/components/brand/louis-mark";
import { SidebarChatItem } from "@/app/components/shared/SidebarChatItem";
import { listProjects } from "@/app/lib/louisApi";

interface NavItem {
    href: string;
    label: string;       // English fallback (also the translation source-of-truth)
    labelKey: string;    // translation key — see src/i18n/dictionaries.ts
    icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
    id: string;
    label: string;
    labelKey: string;
    items: NavItem[];
    /** Whether this group is collapsed by default. */
    defaultCollapsed?: boolean;
}

// Pinned items always show (never collapsed). Top-of-mind daily actions.
// Home is intentionally NOT pinned anymore — /assistant is now the unified
// entry surface (dashboard widgets + composer in one). /home stays as a
// redirect so old links resolve.
const PINNED: NavItem[] = [
    { href: "/assistant",  label: "Assistant", labelKey: "nav.assistant", icon: MessageSquare },
    { href: "/feed",       label: "Newsfeed",  labelKey: "nav.newsfeed",  icon: Rss },
    { href: "/inbox",      label: "Inbox",     labelKey: "nav.inbox",     icon: Inbox },
    { href: "/all-chats",  label: "All Chats", labelKey: "nav.all_chats", icon: MessageSquareDashed },
    { href: "/projects",   label: "Projects",  labelKey: "nav.projects",  icon: FolderOpen },
];

// Workbench + Practice merged into a single Work group per the HAQQ
// prototype direction. Customize collapses Skills/Workflows/Integrations
// since they're all surfaced again from inside /customize.
const NAV_GROUPS: NavGroup[] = [
    {
        id: "work",
        label: "Work",
        labelKey: "nav.work",
        items: [
            { href: "/doc-workspace",     label: "Doc Workspace",   labelKey: "nav.doc_workspace",   icon: FileText },
            { href: "/drafting-board",    label: "Drafting Board",  labelKey: "nav.drafting_board",  icon: Network },
            { href: "/clauses",           label: "Clause Library",  labelKey: "nav.clause_library",  icon: BookOpen },
            { href: "/risk",              label: "Risk Scanner",    labelKey: "nav.risk_scanner",    icon: ShieldAlert },
            { href: "/citations",         label: "Citations",       labelKey: "nav.citations",       icon: Quote },
            { href: "/calculators/eos",   label: "EOS Calculator",  labelKey: "nav.eos_calculator",  icon: Calculator },
            { href: "/legal-flows",       label: "Legal Flows",     labelKey: "nav.legal_flows",     icon: Workflow },
            { href: "/tabular-reviews",   label: "Tabular Review",  labelKey: "nav.tabular_review",  icon: Table2 },
            { href: "/prompt-library",    label: "Prompt Library",  labelKey: "nav.prompt_library",  icon: BookMarked },
            { href: "/vault",             label: "Vault",            labelKey: "nav.vault",           icon: Lock },
            { href: "/matters",           label: "Matters",          labelKey: "nav.matters",         icon: Briefcase },
            { href: "/efirm",             label: "e-Firm",           labelKey: "nav.efirm",           icon: Building2 },
            { href: "/routines",          label: "Routines",         labelKey: "nav.routines",        icon: Repeat },
        ],
    },
    {
        id: "customize",
        label: "Customize",
        labelKey: "nav.customize",
        defaultCollapsed: true,
        items: [
            { href: "/customize",         label: "Customize hub",  labelKey: "nav.customize",     icon: SlidersHorizontal },
            { href: "/skills",            label: "Skills",         labelKey: "nav.skills",        icon: Sparkles },
            { href: "/workflows",         label: "Workflows",      labelKey: "nav.workflows",     icon: Library },
            { href: "/integrations",      label: "Integrations",   labelKey: "nav.integrations",  icon: Plug },
        ],
    },
    {
        id: "account",
        label: "Account",
        labelKey: "nav.account",
        defaultCollapsed: true,
        items: [
            { href: "/settings",          label: "Settings",       labelKey: "nav.settings",      icon: SettingsIcon },
            { href: "/settings/api-keys", label: "API Keys",       labelKey: "nav.api_keys",      icon: Key },
            { href: "/billing",           label: "Billing",        labelKey: "nav.billing",       icon: CreditCard },
            { href: "/upgrade",           label: "Upgrade",        labelKey: "nav.upgrade",       icon: Zap },
            { href: "/team",              label: "Team",           labelKey: "nav.team",          icon: Users },
        ],
    },
    {
        id: "more",
        label: "More",
        labelKey: "nav.more",
        defaultCollapsed: true,
        items: [
            { href: "/academy",  label: "Academy",   labelKey: "nav.academy",  icon: BookOpenCheck },
            { href: "/referral", label: "Referral",  labelKey: "nav.referral", icon: Gift },
            { href: "/about",    label: "About",     labelKey: "nav.about",    icon: Info },
        ],
    },
];

// Favorites: lightweight per-user pin list stored in localStorage. Lets
// users build their own preferred sidebar — independent of the
// canonical groups above. Persistence is browser-local (not server)
// because it's a UI-only preference that doesn't need cross-device sync.
const FAVORITES_KEY = "louis.sidebar.favorites";

function readFavorites(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((v) => typeof v === "string")
            : [];
    } catch {
        return [];
    }
}

function writeFavorites(value: string[]) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(value));
    } catch {
        /* quota — ignore */
    }
}

function allNavItems(): NavItem[] {
    return [
        ...PINNED,
        ...NAV_GROUPS.flatMap((g) => g.items),
    ];
}

interface AppSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
    const { user, signOut } = useAuth();
    const { profile } = useUserProfile();
    const { t } = useLocale();
    const { chats, currentChatId, setCurrentChatId } = useChatHistoryContext();
    const router = useRouter();
    const pathname = usePathname();
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [historyCollapsed, setHistoryCollapsed] = useState(false);
    const [favorites, setFavorites] = useState<string[]>([]);

    useEffect(() => {
        setFavorites(readFavorites());
    }, []);

    function toggleFavorite(href: string) {
        setFavorites((prev) => {
            const next = prev.includes(href)
                ? prev.filter((h) => h !== href)
                : [...prev, href];
            writeFavorites(next);
            return next;
        });
    }

    // Per-group collapsed state, persisted to localStorage
    const [groupsCollapsed, setGroupsCollapsed] = useState<Record<string, boolean>>(() => {
        if (typeof window === "undefined") return {};
        try {
            const stored = localStorage.getItem("louis.sidebar.groups");
            if (stored) return JSON.parse(stored);
        } catch {}
        const init: Record<string, boolean> = {};
        for (const g of NAV_GROUPS) init[g.id] = !!g.defaultCollapsed;
        return init;
    });

    function toggleGroup(id: string) {
        setGroupsCollapsed(prev => {
            const next = { ...prev, [id]: !prev[id] };
            try { localStorage.setItem("louis.sidebar.groups", JSON.stringify(next)); } catch {}
            return next;
        });
    }
    const [projectNames, setProjectNames] = useState<Record<string, string>>(
        {},
    );

    useEffect(() => {
        if (!user) return;
        listProjects()
            .then((projects) => {
                const map: Record<string, string> = {};
                for (const p of projects) map[p.id] = p.name;
                setProjectNames(map);
            })
            .catch(() => {});
    }, [user]);

    useEffect(() => {
        if (!isOpen) setShouldAnimate(true);
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = () => setIsDropdownOpen(false);
        if (isDropdownOpen) {
            document.addEventListener("click", handleClickOutside);
            return () =>
                document.removeEventListener("click", handleClickOutside);
        }
    }, [isDropdownOpen]);

    useEffect(() => {
        if (pathname.startsWith("/assistant/chat/")) {
            const chatId = pathname.split("/").pop() ?? null;
            setCurrentChatId(chatId);
            return;
        }

        const projectChatMatch = pathname.match(
            /^\/projects\/[^/]+\/assistant\/chat\/([^/]+)/,
        );
        if (projectChatMatch) {
            setCurrentChatId(projectChatMatch[1]);
            return;
        }

        if (pathname === "/assistant") {
            setCurrentChatId(null);
        }
    }, [pathname, setCurrentChatId]);

    const getUserInitials = (email: string) => {
        if (profile?.displayName)
            return profile.displayName.charAt(0).toUpperCase();
        return email.charAt(0).toUpperCase();
    };

    const getDisplayName = () => {
        if (!profile) return "";
        return profile.displayName || user?.email?.split("@")[0] || "";
    };

    const getUserTier = () => {
        if (!profile) return "";
        return profile.tier || "Free";
    };

    const [notifOpen, setNotifOpen] = useState(false);
    const [launcherOpen, setLauncherOpen] = useState(false);

    useEffect(() => {
        if (!launcherOpen) return;
        const close = () => setLauncherOpen(false);
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, [launcherOpen]);

    if (!user) return null;

    return (
        <>
        <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />

        <div
            className={`${
                isOpen
                    ? "w-64 h-dvh bg-gray-50 border-r"
                    : "w-14 md:h-dvh md:bg-gray-50 md:border-r h-auto bg-transparent"
            } border-gray-200 flex flex-col transition-all duration-300 absolute md:relative z-99 overflow-visible`}
        >
            {/* Toggle + Logo */}
            <div
                className={`mb-3 items-center justify-between px-2.5 py-2 ${
                    !isOpen ? "hidden md:flex" : "flex"
                }`}
            >
                {isOpen && (
                    <div className="px-2.5">
                        <Link
                            href="/home"
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <LouisMark size={26} />
                            <span
                                className={`text-2xl font-light font-serif text-gray-900 ${
                                    shouldAnimate ? "sidebar-fade-in" : ""
                                }`}
                            >
                                Louis
                            </span>
                        </Link>
                    </div>
                )}
                {isOpen && (
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setLauncherOpen(o => !o); }}
                            className="relative h-9 w-9 p-2.5 items-center flex hover:bg-gray-100 rounded-md transition-colors"
                            title="HAQQ products"
                        >
                            <Grid3x3 className="h-4 w-4" />
                        </button>
                        {launcherOpen && (
                            <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2" onClick={e => e.stopPropagation()}>
                                <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 px-2 py-1">HAQQ products</div>
                                <a href="https://louis.haqq.ai" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-blue-50 text-sm">
                                    <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-bold">L</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium">Louis</div>
                                        <div className="text-[10px] text-gray-500">Legal AI · you are here</div>
                                    </div>
                                </a>
                                <a href="https://justinian.haqq.ai" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 text-sm">
                                    <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-purple-700 text-[10px] font-bold">J</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium">Justinian</div>
                                        <div className="text-[10px] text-gray-500">Legal education</div>
                                    </div>
                                </a>
                                <a href="https://justice.haqq.ai" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 text-sm">
                                    <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-700 text-[10px] font-bold">J</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium">Justice</div>
                                        <div className="text-[10px] text-gray-500">Access to law</div>
                                    </div>
                                </a>
                                <a href="https://openclaw.org" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 text-sm">
                                    <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-amber-700 text-[10px] font-bold">O</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium">OpenClaw</div>
                                        <div className="text-[10px] text-gray-500">Open-source case management</div>
                                    </div>
                                </a>
                                <div className="border-t border-gray-100 my-1" />
                                <Link href="/settings/api-keys" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-xs text-gray-700">
                                    <Key className="w-3.5 h-3.5" /> API keys
                                </Link>
                                <Link href="/integrations" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-xs text-gray-700">
                                    <Plug className="w-3.5 h-3.5" /> Integrations
                                </Link>
                                <Link href="/docs" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-xs text-gray-700">
                                    <BookOpenCheck className="w-3.5 h-3.5" /> Docs
                                </Link>
                                <Link href="/about" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-xs text-gray-700">
                                    <Info className="w-3.5 h-3.5" /> About Louis
                                </Link>
                            </div>
                        )}
                    </div>
                )}
                {isOpen && (
                    <button
                        onClick={() => setNotifOpen(true)}
                        className="relative h-9 w-9 p-2.5 items-center flex hover:bg-gray-100 rounded-md transition-colors"
                        title="Notifications"
                    >
                        <Bell className="h-4 w-4" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                    </button>
                )}
                <button
                    onClick={onToggle}
                    className="h-9 w-9 p-2.5 items-center flex hover:bg-gray-100 rounded-md transition-colors"
                    title={isOpen ? "Close sidebar" : "Open sidebar"}
                >
                    <PanelLeft className="h-4 w-4" />
                </button>
            </div>

            {/* Nav: favorites (per-user pin list) first, then pinned-by-default items */}
            <div className="overflow-y-auto flex-1 min-h-0 pb-2">
                {favorites.length > 0 && (() => {
                    const all = allNavItems();
                    const favItems = favorites
                        .map((href) => all.find((i) => i.href === href))
                        .filter((i): i is NavItem => !!i);
                    if (favItems.length === 0) return null;
                    return (
                        <div className="mb-1">
                            {isOpen && (
                                <div className="px-5 py-1 flex items-center justify-between text-[10px] uppercase tracking-wide font-semibold text-gray-500">
                                    <span className="inline-flex items-center gap-1">
                                        <Star className="w-3 h-3" />
                                        Favorites
                                    </span>
                                </div>
                            )}
                            {favItems.map(({ href, label, labelKey, icon: Icon }) => {
                                const text = t(labelKey) || label;
                                const isActive = pathname === href || pathname.startsWith(href + "/");
                                return (
                                    <div key={`fav-${href}`} className="py-0.5 px-2.5 group/item">
                                        <div
                                            className={`w-full h-8 flex items-center gap-3 px-2.5 py-1.5 rounded-md transition-colors text-left ${
                                                isActive ? "bg-gray-100 text-gray-900" : "hover:bg-gray-100 text-gray-700"
                                            } ${!isOpen ? "hidden md:flex" : "flex"}`}
                                        >
                                            <button
                                                onClick={() => router.push(href)}
                                                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                                title={!isOpen ? text : ""}
                                            >
                                                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-gray-900" : "text-gray-600"}`} />
                                                {isOpen && <span className="text-[13px] truncate">{text}</span>}
                                            </button>
                                            {isOpen && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleFavorite(href);
                                                    }}
                                                    className="opacity-100 text-amber-500 hover:text-amber-600"
                                                    aria-label="Unpin from favorites"
                                                    title="Unpin"
                                                >
                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}

                {PINNED.map(({ href, label, labelKey, icon: Icon }) => {
                    const text = t(labelKey) || label;
                    const isActive = pathname === href || pathname.startsWith(href + "/");
                    const isFav = favorites.includes(href);
                    return (
                        <div key={href} className="py-0.5 px-2.5 group/item">
                            <div
                                className={`w-full h-9 flex items-center gap-3 px-2.5 py-2 rounded-md transition-colors text-left ${
                                    isActive ? "bg-gray-100 text-gray-900" : "hover:bg-gray-100 text-gray-700"
                                } ${!isOpen ? "hidden md:flex" : "flex"}`}
                            >
                                <button
                                    onClick={() => router.push(href)}
                                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                    title={!isOpen ? text : ""}
                                >
                                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-gray-900" : "text-black"}`} />
                                    {isOpen && (
                                        <span className={`text-sm font-medium ${shouldAnimate ? "sidebar-fade-in-2" : ""}`}>
                                            {text}
                                        </span>
                                    )}
                                </button>
                                {isOpen && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(href);
                                        }}
                                        className={`${isFav ? "opacity-100 text-amber-500" : "opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-amber-500"} transition-opacity`}
                                        aria-label={isFav ? "Unpin from favorites" : "Pin to favorites"}
                                        title={isFav ? "Unpin from favorites" : "Pin to favorites"}
                                    >
                                        <Star className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Groups */}
                {NAV_GROUPS.map(group => {
                    const collapsed = groupsCollapsed[group.id];
                    return (
                        <div key={group.id} className="mt-2">
                            {isOpen && (
                                <button
                                    onClick={() => toggleGroup(group.id)}
                                    className="w-full px-5 py-1 flex items-center justify-between text-[10px] uppercase tracking-wide font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <span>{t(group.labelKey) || group.label}</span>
                                    <ChevronRight className={`h-3 w-3 transition-transform ${!collapsed ? "rotate-90" : ""}`} />
                                </button>
                            )}
                            {(!collapsed || !isOpen) && group.items.map(({ href, label, labelKey, icon: Icon }) => {
                                const text = t(labelKey) || label;
                                const isActive = pathname === href || pathname.startsWith(href + "/");
                                const isFav = favorites.includes(href);
                                return (
                                    <div key={href} className="py-0.5 px-2.5 group/item">
                                        <div
                                            className={`w-full h-8 flex items-center gap-3 px-2.5 py-1.5 rounded-md transition-colors text-left ${
                                                isActive ? "bg-gray-100 text-gray-900" : "hover:bg-gray-100 text-gray-700"
                                            } ${!isOpen ? "hidden md:flex" : "flex"}`}
                                        >
                                            <button
                                                onClick={() => router.push(href)}
                                                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                                title={!isOpen ? text : ""}
                                            >
                                                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-gray-900" : "text-gray-600"}`} />
                                                {isOpen && <span className="text-[13px] truncate">{text}</span>}
                                            </button>
                                            {isOpen && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleFavorite(href);
                                                    }}
                                                    className={`${isFav ? "opacity-100 text-amber-500" : "opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-amber-500"} transition-opacity`}
                                                    aria-label={isFav ? "Unpin from favorites" : "Pin to favorites"}
                                                    title={isFav ? "Unpin from favorites" : "Pin to favorites"}
                                                >
                                                    <Star className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Assistant History */}
            {isOpen && pathname.startsWith("/assistant") && (
                <div className="mt-4 flex-1 min-h-0 flex flex-col">
                    <button
                        onClick={() => setHistoryCollapsed((v) => !v)}
                        className={`mb-2 px-5 flex items-center justify-between text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors ${
                            shouldAnimate ? "sidebar-fade-in" : ""
                        }`}
                    >
                        <span>Assistant History</span>
                        <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${historyCollapsed ? "-rotate-90" : ""}`}
                        />
                    </button>
                    <div
                        className={`overflow-y-auto flex-1 ${historyCollapsed ? "hidden" : ""}`}
                    >
                        {!chats ? (
                            <div className="space-y-1 px-2.5">
                                {[40, 60, 50, 70, 45].map((w, i) => (
                                    <div
                                        key={i}
                                        className="h-9 flex items-center px-3 rounded-md"
                                    >
                                        <div
                                            className="h-3 bg-gray-200 rounded animate-pulse"
                                            style={{ width: `${w}%` }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : chats.length === 0 ? (
                            <div
                                className={`text-xs text-gray-500 py-2 px-5 ${
                                    shouldAnimate ? "sidebar-fade-in-2" : ""
                                }`}
                            >
                                No chats yet
                            </div>
                        ) : (
                            <div
                                className={`space-y-1 px-2.5 ${
                                    shouldAnimate ? "sidebar-fade-in-2" : ""
                                }`}
                            >
                                {chats.map((chat) => (
                                    <SidebarChatItem
                                        key={chat.id}
                                        chat={chat}
                                        isActive={currentChatId === chat.id}
                                        projectName={
                                            chat.project_id
                                                ? projectNames[chat.project_id]
                                                : undefined
                                        }
                                        onSelect={() => {
                                            setCurrentChatId(chat.id);
                                            router.push(
                                                chat.project_id
                                                    ? `/projects/${chat.project_id}/assistant/chat/${chat.id}`
                                                    : `/assistant/chat/${chat.id}`,
                                            );
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* User Profile */}
            <div className="mt-auto">
                {user && (
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex items-center transition-colors w-full px-3.5 py-4 border-t border-gray-200 ${
                                !isOpen ? "hidden md:flex" : ""
                            } ${
                                pathname === "/account" || isDropdownOpen
                                    ? "bg-gray-100"
                                    : "hover:bg-gray-100"
                            }`}
                            title={!isOpen ? user.email : undefined}
                        >
                            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-medium font-serif">
                                {getUserInitials(user.email)}
                            </div>
                            {isOpen && (
                                <div
                                    className={`text-left flex-1 min-w-0 pl-3 flex items-center justify-between gap-2 ${
                                        shouldAnimate ? "sidebar-fade-in-2" : ""
                                    }`}
                                >
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 leading-none">
                                            {getDisplayName()}
                                        </div>
                                        <div className="text-[12px] text-gray-500 leading-none">
                                            {getUserTier()}
                                        </div>
                                    </div>
                                    <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                </div>
                            )}
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute bottom-full left-0 m-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-50 w-62 whitespace-nowrap">
                                <button
                                    onClick={() => {
                                        router.push("/account");
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded-md"
                                >
                                    <User className="h-4 w-4" />
                                    {t("nav.account") || "Account Settings"}
                                </button>
                                <button
                                    onClick={() => {
                                        router.push("/settings");
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded-md"
                                >
                                    <SettingsIcon className="h-4 w-4" />
                                    {t("nav.settings") || "Settings"}
                                </button>
                                <div className="my-1 h-px bg-gray-100" />
                                <button
                                    onClick={async () => {
                                        setIsDropdownOpen(false);
                                        try {
                                            await signOut();
                                        } catch (e) {
                                            console.error(
                                                "[sidebar] signOut failed",
                                                e,
                                            );
                                        }
                                        // Drop the per-device fast-path so the
                                        // next account on this browser doesn't
                                        // inherit the onboarding-skip flag.
                                        if (
                                            typeof window !== "undefined" &&
                                            user?.id
                                        ) {
                                            try {
                                                window.localStorage.removeItem(
                                                    `louis.onboarded:${user.id}`,
                                                );
                                            } catch {
                                                /* ignore */
                                            }
                                        }
                                        router.push("/login");
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-md"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t("action.sign_out") || "Sign out"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        </>
    );
}
