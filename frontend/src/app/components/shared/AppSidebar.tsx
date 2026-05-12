"use client";

import { useState, useEffect } from "react";
import {
    PanelLeft,
    MessageSquare,
    FolderOpen,
    Table2,
    Library,
    User,
    ChevronsUpDown,
    ChevronDown,
    Sparkles,
    Network,
    Gift,
    SlidersHorizontal,
    FileText,
    Home,
    MessageSquareDashed,
    Repeat,
    Briefcase,
    Settings as SettingsIcon,
    Bell,
    BookOpen,
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
} from "lucide-react";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useChatHistoryContext } from "@/app/contexts/ChatHistoryContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LouisIcon } from "@/components/chat/louis-icon";
import { LouisMark } from "@/components/brand/louis-mark";
import { SidebarChatItem } from "@/app/components/shared/SidebarChatItem";
import { listProjects } from "@/app/lib/louisApi";

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
    id: string;
    label: string;
    items: NavItem[];
    /** Whether this group is collapsed by default. */
    defaultCollapsed?: boolean;
}

// Pinned items always show (never collapsed). The first 4 daily actions.
const PINNED: NavItem[] = [
    { href: "/home",       label: "Home",        icon: Home },
    { href: "/assistant",  label: "Assistant",   icon: MessageSquare },
    { href: "/all-chats",  label: "All Chats",   icon: MessageSquareDashed },
    { href: "/projects",   label: "Projects",    icon: FolderOpen },
];

const NAV_GROUPS: NavGroup[] = [
    {
        id: "workbench",
        label: "Workbench",
        items: [
            { href: "/doc-workspace",     label: "Doc Workspace",   icon: FileText },
            { href: "/drafting-board",    label: "Drafting Board",  icon: Network },
            { href: "/clauses",           label: "Clause Library",  icon: BookOpen },
            { href: "/risk",              label: "Risk Scanner",    icon: ShieldAlert },
            { href: "/citations",         label: "Citations",       icon: Quote },
            { href: "/calculators/eos",   label: "EOS Calculator",  icon: Calculator },
            { href: "/legal-flows",       label: "Legal Flows",     icon: Workflow },
            { href: "/tabular-reviews",   label: "Tabular Review",  icon: Table2 },
        ],
    },
    {
        id: "practice",
        label: "Practice",
        items: [
            { href: "/matters",   label: "Matters",   icon: Briefcase },
            { href: "/efirm",     label: "e-Firm",    icon: Building2 },
            { href: "/routines",  label: "Routines",  icon: Repeat },
        ],
    },
    {
        id: "customize",
        label: "Customize",
        defaultCollapsed: true,
        items: [
            { href: "/customize",         label: "Preferences",   icon: SlidersHorizontal },
            { href: "/skills",            label: "Skills",        icon: Sparkles },
            { href: "/workflows",         label: "Workflows",     icon: Library },
            { href: "/integrations",      label: "Integrations",  icon: Plug },
            { href: "/settings/api-keys", label: "API Keys",      icon: Key },
            { href: "/settings",          label: "Account",       icon: SettingsIcon },
        ],
    },
    {
        id: "more",
        label: "More",
        defaultCollapsed: true,
        items: [
            { href: "/docs",      label: "Docs",      icon: BookOpenCheck },
            { href: "/referral",  label: "Referral",  icon: Gift },
            { href: "/about",     label: "About",     icon: Info },
        ],
    },
];

interface AppSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

export function AppSidebar({ isOpen, onToggle }: AppSidebarProps) {
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const { chats, currentChatId, setCurrentChatId } = useChatHistoryContext();
    const router = useRouter();
    const pathname = usePathname();
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [historyCollapsed, setHistoryCollapsed] = useState(false);

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

            {/* Nav: pinned items first */}
            <div className="overflow-y-auto flex-1 min-h-0 pb-2">
                {PINNED.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href || pathname.startsWith(href + "/");
                    return (
                        <div key={href} className="py-0.5 px-2.5">
                            <button
                                onClick={() => router.push(href)}
                                title={!isOpen ? label : ""}
                                className={`w-full h-9 flex items-center gap-3 px-2.5 py-2 rounded-md transition-colors text-left ${
                                    isActive ? "bg-gray-100 text-gray-900" : "hover:bg-gray-100 text-gray-700"
                                } ${!isOpen ? "hidden md:flex" : "flex"}`}
                            >
                                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-gray-900" : "text-black"}`} />
                                {isOpen && (
                                    <span className={`text-sm font-medium ${shouldAnimate ? "sidebar-fade-in-2" : ""}`}>
                                        {label}
                                    </span>
                                )}
                            </button>
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
                                    <span>{group.label}</span>
                                    <ChevronRight className={`h-3 w-3 transition-transform ${!collapsed ? "rotate-90" : ""}`} />
                                </button>
                            )}
                            {(!collapsed || !isOpen) && group.items.map(({ href, label, icon: Icon }) => {
                                const isActive = pathname === href || pathname.startsWith(href + "/");
                                return (
                                    <div key={href} className="py-0.5 px-2.5">
                                        <button
                                            onClick={() => router.push(href)}
                                            title={!isOpen ? label : ""}
                                            className={`w-full h-8 flex items-center gap-3 px-2.5 py-1.5 rounded-md transition-colors text-left ${
                                                isActive ? "bg-gray-100 text-gray-900" : "hover:bg-gray-100 text-gray-700"
                                            } ${!isOpen ? "hidden md:flex" : "flex"}`}
                                        >
                                            <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? "text-gray-900" : "text-gray-600"}`} />
                                            {isOpen && <span className="text-[13px]">{label}</span>}
                                        </button>
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
                                    Account Settings
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
