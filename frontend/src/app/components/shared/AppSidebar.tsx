"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    PanelLeft,
    PanelLeftClose,
    MessageSquare,
    FolderOpen,
    Table2,
    Lock,
    Library,
    User,
    ChevronsUpDown,
    Sparkles,
    Network,
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
    Blocks,
    Key,
    Grid3x3,
    Building2,
    ChevronRight,
    Inbox,
    Users,
    LogOut,
    Share2,
    Star,
    Search,
    GraduationCap,
} from "lucide-react";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useChatHistoryContext } from "@/app/contexts/ChatHistoryContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LouisMark } from "@/components/brand/louis-mark";
import { SidebarChatItem } from "@/app/components/shared/SidebarChatItem";
import { listProjectsCached, getAuthHeader } from "@/app/lib/louisApi";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

// ──────────────────────────────────────────────────────────────────────────
// Vertical command rail rebuild (May 2026)
//
// Two zones (desktop):
//   1. Icon rail — always 64px, brand at top, pinned/favorited icons stacked,
//      separators, then bottom utility cluster (search, academy, share,
//      avatar). Tooltip on hover.
//   2. Optional 240px panel — slides out when expanded. Shows the active
//      matter section, full text labels for grouped nav, favorites, chat
//      history, etc.
//
// Mobile (<768px): when `isOpen` is true the entire shell (rail + panel)
// behaves as a slide-out drawer triggered from MobileBottomNav's Menu.
// When `isOpen` is false we render nothing — mobile users navigate from
// MobileBottomNav.
//
// State that persists in localStorage:
//   - louis.sidebar.expanded     bool   (desktop panel open?)
//   - louis.sidebar.favorites    string[] (kept from old file)
//   - louis.sidebar.groups       Record<id, collapsed> (kept; drives panel)
//   - louis.activeMatter         { id, name, number? } | null
//        Other surfaces (matter detail pages) can write to this key to
//        light up the active-matter pin. We don't have a global matter
//        context yet — TODO: when one is introduced, swap this for a real
//        context subscription.
// ──────────────────────────────────────────────────────────────────────────

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
    /** Whether this group is collapsed by default in the expanded panel. */
    defaultCollapsed?: boolean;
}

// Pinned items always show in the icon rail. Top-of-mind daily actions.
const PINNED: NavItem[] = [
    { href: "/assistant",  label: "Assistant", labelKey: "nav.assistant", icon: MessageSquare },
    { href: "/inbox",      label: "Inbox",     labelKey: "nav.inbox",     icon: Inbox },
    { href: "/all-chats",  label: "All Chats", labelKey: "nav.all_chats", icon: MessageSquareDashed },
    { href: "/projects",   label: "Projects",  labelKey: "nav.projects",  icon: FolderOpen },
];

// Workbench + Practice merged into a single Work group. Customize collapses
// Skills/Workflows/Integrations since they're all surfaced again from
// inside /customize.
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
            { href: "/plugins",           label: "Plugins",        labelKey: "nav.plugins",       icon: Blocks },
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
            { href: "/team",              label: "Team",           labelKey: "nav.team",          icon: Users },
        ],
    },
    {
        id: "more",
        label: "More",
        labelKey: "nav.more",
        defaultCollapsed: true,
        items: [
            { href: "/academy",  label: "Academy",     labelKey: "nav.academy",  icon: BookOpenCheck },
            { href: "/referral", label: "Share Louis", labelKey: "nav.share",    icon: Share2 },
            { href: "/about",    label: "About",       labelKey: "nav.about",    icon: Info },
        ],
    },
];

// ── Favorites store ────────────────────────────────────────────────────────
const FAVORITES_KEY = "louis.sidebar.favorites";
const EXPANDED_KEY = "louis.sidebar.expanded";
const GROUPS_KEY = "louis.sidebar.groups";
const ACTIVE_MATTER_KEY = "louis.activeMatter";

function readFavorites(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(FAVORITES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
    } catch {
        return [];
    }
}

function writeFavorites(value: string[]) {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(value)); } catch { /* quota */ }
}

function allNavItems(): NavItem[] {
    return [...PINNED, ...NAV_GROUPS.flatMap((g) => g.items)];
}

// ── Active matter (lightweight; URL-derived + localStorage fallback) ──────
interface ActiveMatter { id: string; name: string; number?: string }

function readActiveMatter(): ActiveMatter | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(ACTIVE_MATTER_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.id === "string" && typeof parsed.name === "string") {
            return parsed as ActiveMatter;
        }
        return null;
    } catch {
        return null;
    }
}

// ── Tooltip primitive (CSS-only, respects reduced motion) ─────────────────
function RailTooltip({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="relative group/tip">
            {children}
            <span
                role="tooltip"
                className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-foreground text-white text-[11px] font-sans px-2 py-1 shadow-lg opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-50 motion-reduce:transition-none"
            >
                {label}
            </span>
        </div>
    );
}

// ── Icon rail button ──────────────────────────────────────────────────────
interface RailButtonProps {
    label: string;
    isActive?: boolean;
    onClick?: () => void;
    href?: string;
    children: React.ReactNode;
    ariaLabel?: string;
    /** Subtle dot indicator (e.g. unread bell, active matter activity). */
    showDot?: boolean;
}

function RailButton({ label, isActive, onClick, href, children, ariaLabel, showDot }: RailButtonProps) {
    const router = useRouter();
    const handle = () => {
        if (onClick) onClick();
        else if (href) router.push(href);
    };
    return (
        <RailTooltip label={label}>
            <button
                type="button"
                onClick={handle}
                aria-label={ariaLabel ?? label}
                title={label /* native fallback for keyboard / screenreaders that ignore CSS tooltip */}
                className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors text-muted-foreground hover:bg-amber-50/60 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/40 motion-reduce:transition-none ${
                    isActive ? "bg-amber-50/80 text-amber-800" : ""
                }`}
            >
                {/* Left gold-leaf indicator on active */}
                {isActive && (
                    <span
                        aria-hidden
                        className="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-amber-700/80"
                    />
                )}
                {children}
                {showDot && (
                    <span
                        aria-hidden
                        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-700"
                    />
                )}
            </button>
        </RailTooltip>
    );
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

    // ── UI state ─────────────────────────────────────────────────────────
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [launcherOpen, setLauncherOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [matterSectionCollapsed, setMatterSectionCollapsed] = useState(false);
    const [projectNames, setProjectNames] = useState<Record<string, string>>({});

    // localStorage-backed state with lazy initializers (SSR-safe — they run
    // once on the client after hydration without an extra effect).
    const [favorites, setFavorites] = useState<string[]>(() => readFavorites());
    const [activeMatter, setActiveMatter] = useState<ActiveMatter | null>(() => readActiveMatter());
    const [groupsCollapsed, setGroupsCollapsed] = useState<Record<string, boolean>>(() => {
        if (typeof window === "undefined") {
            const init: Record<string, boolean> = {};
            for (const g of NAV_GROUPS) init[g.id] = !!g.defaultCollapsed;
            return init;
        }
        try {
            const stored = localStorage.getItem(GROUPS_KEY);
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        const init: Record<string, boolean> = {};
        for (const g of NAV_GROUPS) init[g.id] = !!g.defaultCollapsed;
        return init;
    });

    // Whether the *desktop* expanded panel is showing. The parent layout
    // owns `isOpen` for the mobile drawer + desktop toggle, but we also
    // track a local "expanded" flag persisted under `louis.sidebar.expanded`
    // so the panel state survives reloads.
    const [expandedPanel, setExpandedPanel] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        try {
            const stored = localStorage.getItem(EXPANDED_KEY);
            if (stored !== null) return stored === "true";
        } catch { /* ignore */ }
        // Default: expanded on desktop, collapsed on mobile.
        return window.innerWidth >= 768;
    });

    // Cross-tab sync for active matter (and pick up writes from other surfaces
    // that may set `louis.activeMatter` when a matter detail page opens).
    useEffect(() => {
        if (typeof window === "undefined") return;
        const onStorage = (e: StorageEvent) => {
            if (e.key === ACTIVE_MATTER_KEY) setActiveMatter(readActiveMatter());
            if (e.key === FAVORITES_KEY) setFavorites(readFavorites());
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // Detect active matter from URL: `/matters/:id`. We derive the
    // matter from a combination of (a) the URL (canonical) and (b) the
    // localStorage-backed `activeMatter` state (sticky across navigations).
    // TODO: replace this with a proper MatterContext when the backend
    // exposes a per-matter detail route.
    const urlMatterId = useMemo(() => {
        const m = pathname.match(/^\/matters\/([^/]+)(?:\/|$)/);
        if (!m) return null;
        const id = m[1];
        if (id === "new" || id === "list") return null;
        return id;
    }, [pathname]);

    // Persist URL-derived matter id to storage so the pin survives navigation
    // away from /matters/:id. The previous version used a 6-char UUID slice
    // as the label ("Matter f4a8b2") which is unreadable; resolve the real
    // matter name from the backend instead.
    useEffect(() => {
        if (!urlMatterId) return;
        if (activeMatter && activeMatter.id === urlMatterId && activeMatter.name && !activeMatter.name.startsWith("Matter ")) {
            return;
        }
        let cancelled = false;
        (async () => {
            // Optimistic: show the UUID slice while we resolve so the chip
            // doesn't flicker between empty → real. Once the backend
            // responds we overwrite with the proper client + matter number.
            const placeholder: ActiveMatter = {
                id: urlMatterId,
                name: `Matter ${urlMatterId.slice(0, 6)}`,
            };
            setActiveMatter(placeholder);
            try {
                const auth = await getAuthHeader();
                const r = await fetch(`${API_BASE}/api/matters/${urlMatterId}`, {
                    headers: auth,
                    cache: "no-store",
                });
                if (!r.ok || cancelled) return;
                const json = (await r.json()) as {
                    matter?: { id: string; clientName?: string; matterNumber?: string };
                };
                const m = json.matter;
                if (!m) return;
                const next: ActiveMatter = {
                    id: m.id,
                    name: m.clientName
                        ? m.matterNumber
                            ? `${m.clientName} · ${m.matterNumber}`
                            : m.clientName
                        : placeholder.name,
                };
                try { localStorage.setItem(ACTIVE_MATTER_KEY, JSON.stringify(next)); } catch { /* ignore */ }
                if (!cancelled) setActiveMatter(next);
            } catch { /* ignore — keep the placeholder */ }
        })();
        return () => {
            cancelled = true;
        };
    // activeMatter is intentionally read inside (for the short-circuit) but
    // excluded from deps to avoid re-fetching on every name change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlMatterId]);

    // ── Favorites toggle ─────────────────────────────────────────────────
    const toggleFavorite = useCallback((href: string) => {
        setFavorites((prev) => {
            const next = prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href];
            writeFavorites(next);
            return next;
        });
    }, []);

    const toggleGroup = useCallback((id: string) => {
        setGroupsCollapsed((prev) => {
            const next = { ...prev, [id]: !prev[id] };
            try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const toggleExpandedPanel = useCallback(() => {
        setExpandedPanel((prev) => {
            const next = !prev;
            try { localStorage.setItem(EXPANDED_KEY, String(next)); } catch {}
            return next;
        });
    }, []);

    // Projects → resolve chat history's project name labels. Keyed on
    // user.id so an identity-only re-render of the user object doesn't
    // refire the fetch; the cache in louisApi.ts absorbs duplicate calls
    // across mounts within the TTL window.
    useEffect(() => {
        if (!user?.id) return;
        listProjectsCached()
            .then((projects) => {
                const map: Record<string, string> = {};
                for (const p of projects) map[p.id] = p.name;
                setProjectNames(map);
            })
            .catch(() => {});
    }, [user?.id]);

    // Dropdown auto-close on outside click.
    useEffect(() => {
        if (!isDropdownOpen) return;
        const handle = () => setIsDropdownOpen(false);
        document.addEventListener("click", handle);
        return () => document.removeEventListener("click", handle);
    }, [isDropdownOpen]);

    useEffect(() => {
        if (!launcherOpen) return;
        const close = () => setLauncherOpen(false);
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, [launcherOpen]);

    // Keep chat selection in sync with the URL (preserved from old file).
    useEffect(() => {
        if (pathname.startsWith("/assistant/chat/")) {
            const chatId = pathname.split("/").pop() ?? null;
            setCurrentChatId(chatId);
            return;
        }
        const projectChatMatch = pathname.match(/^\/projects\/[^/]+\/assistant\/chat\/([^/]+)/);
        if (projectChatMatch) {
            setCurrentChatId(projectChatMatch[1]);
            return;
        }
        if (pathname === "/assistant") setCurrentChatId(null);
    }, [pathname, setCurrentChatId]);

    // ── Derived helpers ──────────────────────────────────────────────────
    const isActiveHref = useCallback(
        (href: string) => pathname === href || pathname.startsWith(href + "/"),
        [pathname],
    );

    const favItems: NavItem[] = useMemo(() => {
        const all = allNavItems();
        return favorites
            .map((href) => all.find((i) => i.href === href))
            .filter((i): i is NavItem => !!i)
            .slice(0, 4);
    }, [favorites]);

    const openPalette = useCallback(() => {
        window.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                ctrlKey: true,
                bubbles: true,
            }),
        );
    }, []);

    const getUserInitials = (email: string) => {
        if (profile?.displayName) return profile.displayName.charAt(0).toUpperCase();
        return email.charAt(0).toUpperCase();
    };

    const getDisplayName = () => {
        if (!profile) return "";
        return profile.displayName || user?.email?.split("@")[0] || "";
    };

    // Matter sub-links (rendered inside the expanded panel matter section).
    const matterSubLinks: NavItem[] = useMemo(() => {
        if (!activeMatter) return [];
        const base = `/matters/${activeMatter.id}`;
        return [
            { href: `${base}/files`,    label: "Files",    labelKey: "matter.files",    icon: FileText },
            { href: `${base}/chats`,    label: "Chats",    labelKey: "matter.chats",    icon: MessageSquare },
            { href: `${base}/drafts`,   label: "Drafts",   labelKey: "matter.drafts",   icon: BookMarked },
            { href: `${base}/routines`, label: "Routines", labelKey: "matter.routines", icon: Repeat },
            { href: `${base}/people`,   label: "People",   labelKey: "matter.people",   icon: Users },
        ];
    }, [activeMatter]);

    if (!user) return null;

    // On mobile, when `isOpen` is false hide the whole shell. The
    // MobileBottomNav's Menu button toggles `isOpen` to show the drawer.
    // On desktop the icon rail is always visible; `isOpen` flips the
    // expanded panel.
    const showShellMobile = isOpen;            // visible at all on <md?
    const showPanel = isOpen && expandedPanel; // expanded panel visible on md+?

    return (
        <>
            <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />

            {/* Backdrop for mobile drawer */}
            {showShellMobile && (
                <div
                    className="md:hidden fixed inset-0 bg-black/30 z-40 motion-reduce:transition-none"
                    onClick={onToggle}
                    aria-hidden
                />
            )}

            <div
                className={`flex h-dvh z-50 ${
                    showShellMobile ? "fixed inset-y-0 left-0 md:relative" : "hidden md:flex"
                }`}
                style={{ fontFamily: "var(--font-eb-garamond), ui-serif, serif" }}
            >
                {/* ─── Icon rail ────────────────────────────────────────
                    Always visible (audit 3B). Used to disappear behind the
                    expanded panel, leaving users with no quick way to jump
                    between top-level surfaces when the panel was open. */}
                <nav
                    aria-label="Primary"
                    className="flex flex-col items-center gap-1.5 w-16 shrink-0 border-r border-[#E7E2D6] bg-[#fbf8f2] py-3 overflow-visible"
                >
                    {/* Brand */}
                    <RailTooltip label="Louis · Home">
                        <Link
                            href="/assistant"
                            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-amber-50/60 transition-colors motion-reduce:transition-none"
                            aria-label="Louis home"
                        >
                            <LouisMark size={22} />
                        </Link>
                    </RailTooltip>

                    <div className="w-6 h-px bg-[#E7E2D6] my-1" aria-hidden />

                    {/* Pinned (top 4 surfaces) */}
                    {PINNED.map(({ href, label, labelKey, icon: Icon }) => {
                        const text = t(labelKey) || label;
                        return (
                            <RailButton
                                key={href}
                                label={text}
                                href={href}
                                isActive={isActiveHref(href)}
                            >
                                <Icon className="h-[18px] w-[18px]" />
                            </RailButton>
                        );
                    })}

                    {/* Active matter pin */}
                    {activeMatter && (
                        <>
                            <div className="w-6 h-px bg-[#E7E2D6] my-1" aria-hidden />
                            <RailTooltip label={`Matter · ${activeMatter.name}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Open the panel + scroll matter section open
                                        if (!expandedPanel) toggleExpandedPanel();
                                        setMatterSectionCollapsed(false);
                                        router.push(`/matters/${activeMatter.id}`);
                                    }}
                                    aria-label={`Active matter: ${activeMatter.name}`}
                                    className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/40 motion-reduce:transition-none ${
                                        isActiveHref(`/matters/${activeMatter.id}`)
                                            ? "bg-amber-50/80"
                                            : "hover:bg-amber-50/60"
                                    }`}
                                >
                                    {isActiveHref(`/matters/${activeMatter.id}`) && (
                                        <span
                                            aria-hidden
                                            className="absolute -left-2 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-full bg-amber-700/80"
                                        />
                                    )}
                                    <span className="flex items-center justify-center w-7 h-7 rounded-md border border-amber-700/30 bg-card text-amber-800 text-[12px] font-serif font-medium">
                                        {activeMatter.name.charAt(0).toUpperCase()}
                                    </span>
                                    {/* activity dot */}
                                    <span
                                        aria-hidden
                                        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-700"
                                    />
                                </button>
                            </RailTooltip>
                        </>
                    )}

                    {/* Favorites */}
                    {favItems.length > 0 && (
                        <>
                            <div className="w-6 h-px bg-[#E7E2D6] my-1" aria-hidden />
                            {favItems.map(({ href, label, labelKey, icon: Icon }) => {
                                const text = t(labelKey) || label;
                                return (
                                    <RailButton
                                        key={`fav-${href}`}
                                        label={`★ ${text}`}
                                        href={href}
                                        isActive={isActiveHref(href)}
                                    >
                                        <Icon className="h-[18px] w-[18px]" />
                                    </RailButton>
                                );
                            })}
                        </>
                    )}

                    {/* Search (palette) */}
                    <div className="w-6 h-px bg-[#E7E2D6] my-1" aria-hidden />
                    <RailButton label="Search (⌘K)" onClick={openPalette}>
                        <Search className="h-[18px] w-[18px]" />
                    </RailButton>

                    {/* Notifications */}
                    <RailButton
                        label="Notifications"
                        onClick={() => setNotifOpen(true)}
                        showDot
                    >
                        <Bell className="h-[18px] w-[18px]" />
                    </RailButton>

                    {/* Spacer pushes utility cluster to bottom */}
                    <div className="flex-1" aria-hidden />

                    {/* Bottom utility cluster */}
                    <RailButton label="Academy" href="/academy" isActive={isActiveHref("/academy")}>
                        <GraduationCap className="h-[18px] w-[18px]" />
                    </RailButton>
                    <RailButton label="Share Louis" href="/referral" isActive={isActiveHref("/referral")}>
                        <Share2 className="h-[18px] w-[18px]" />
                    </RailButton>
                    <RailButton label="Settings" href="/settings" isActive={isActiveHref("/settings")}>
                        <SettingsIcon className="h-[18px] w-[18px]" />
                    </RailButton>

                    {/* Avatar dropdown */}
                    <div className="relative">
                        <RailTooltip label={getDisplayName() || user.email}>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsDropdownOpen((v) => !v); }}
                                aria-label="Account menu"
                                className="flex items-center justify-center w-9 h-9 rounded-full bg-foreground text-white text-[12px] font-serif font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/40 motion-reduce:transition-none"
                            >
                                {getUserInitials(user.email)}
                            </button>
                        </RailTooltip>
                        {isDropdownOpen && (
                            <div
                                className="absolute bottom-0 left-full ml-2 w-60 bg-card rounded-lg shadow-lg border border-[#E7E2D6] p-1 z-50 whitespace-nowrap font-sans"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="px-3 py-2 border-b border-border mb-1">
                                    <div className="text-sm font-medium text-foreground truncate">{getDisplayName()}</div>
                                    <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
                                </div>
                                <button
                                    onClick={() => { router.push("/account"); setIsDropdownOpen(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-foreground/80 hover:bg-muted flex items-center gap-2 rounded-md"
                                >
                                    <User className="h-4 w-4" />
                                    {t("nav.account") || "Account Settings"}
                                </button>
                                <button
                                    onClick={() => { router.push("/settings"); setIsDropdownOpen(false); }}
                                    className="w-full px-3 py-2 text-left text-sm text-foreground/80 hover:bg-muted flex items-center gap-2 rounded-md"
                                >
                                    <SettingsIcon className="h-4 w-4" />
                                    {t("nav.settings") || "Settings"}
                                </button>
                                <div className="my-1 h-px bg-muted" />
                                <button
                                    onClick={async () => {
                                        setIsDropdownOpen(false);
                                        try { await signOut(); }
                                        catch (e) { console.error("[sidebar] signOut failed", e); }
                                        if (typeof window !== "undefined" && user?.id) {
                                            try { window.localStorage.removeItem(`louis.onboarded:${user.id}`); } catch {}
                                        }
                                        router.push("/login");
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-md"
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t("action.sign_out") || "Sign out"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Expand/collapse chevron — desktop only */}
                    <button
                        type="button"
                        onClick={toggleExpandedPanel}
                        className="hidden md:flex items-center justify-center w-10 h-8 rounded-lg hover:bg-amber-50/60 text-muted-foreground transition-colors motion-reduce:transition-none"
                        title={expandedPanel ? "Collapse panel" : "Expand panel"}
                        aria-label={expandedPanel ? "Collapse panel" : "Expand panel"}
                    >
                        <PanelLeft className={`h-4 w-4 transition-transform motion-reduce:transition-none ${expandedPanel ? "" : "rotate-180"}`} />
                    </button>
                </nav>

                {/* ─── Expanded panel (slides out) ────────────────────────── */}
                <aside
                    aria-label="Sidebar details"
                    className={`flex flex-col h-dvh bg-[#fbf8f2] border-r border-[#E7E2D6] overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none ${
                        showPanel ? "w-60" : "w-0 border-r-0"
                    }`}
                >
                    {showPanel && (
                        <div className="flex flex-col h-full min-w-[15rem] w-60">
                            {/* Header — brand wordmark + product launcher + collapse */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E2D6]">
                                <Link
                                    href="/assistant"
                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity motion-reduce:transition-none"
                                >
                                    <span className="text-2xl font-light font-serif text-foreground">Louis</span>
                                </Link>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={toggleExpandedPanel}
                                        className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-amber-50/60 transition-colors motion-reduce:transition-none text-muted-foreground"
                                        title="Collapse panel"
                                        aria-label="Collapse panel"
                                    >
                                        <PanelLeftClose className="h-4 w-4" />
                                    </button>
                                    <div className="relative">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setLauncherOpen((o) => !o); }}
                                        className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-amber-50/60 transition-colors motion-reduce:transition-none text-muted-foreground"
                                        title="HAQQ products"
                                        aria-label="HAQQ products"
                                    >
                                        <Grid3x3 className="h-4 w-4" />
                                    </button>
                                    {launcherOpen && (
                                        <div
                                            className="absolute right-0 top-full mt-1 w-64 bg-card border border-[#E7E2D6] rounded-lg shadow-lg z-50 p-2 font-sans"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground px-2 py-1">HAQQ products</div>
                                            <a href="https://louis.haqq.ai" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-blue-50 text-sm">
                                                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-bold">L</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium">Louis</div>
                                                    <div className="text-[10px] text-muted-foreground">Legal AI · you are here</div>
                                                </div>
                                            </a>
                                            <a href="https://justinian.haqq.ai" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted text-sm">
                                                <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-purple-700 text-[10px] font-bold">J</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium">Justinian</div>
                                                    <div className="text-[10px] text-muted-foreground">Legal education</div>
                                                </div>
                                            </a>
                                            <a href="https://justice.haqq.ai" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted text-sm">
                                                <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center text-emerald-700 text-[10px] font-bold">J</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium">Justice</div>
                                                    <div className="text-[10px] text-muted-foreground">Access to law</div>
                                                </div>
                                            </a>
                                            <a href="https://openclaw.org" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted text-sm">
                                                <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-amber-700 text-[10px] font-bold">O</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium">OpenClaw</div>
                                                    <div className="text-[10px] text-muted-foreground">Open-source case management</div>
                                                </div>
                                            </a>
                                            <div className="border-t border-border my-1" />
                                            <Link href="/settings/api-keys" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-xs text-foreground/80">
                                                <Key className="w-3.5 h-3.5" /> API keys
                                            </Link>
                                            <Link href="/integrations" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-xs text-foreground/80">
                                                <Plug className="w-3.5 h-3.5" /> Integrations
                                            </Link>
                                            <Link href="/about" className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-xs text-foreground/80">
                                                <Info className="w-3.5 h-3.5" /> About Louis
                                            </Link>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable body */}
                            <div className="overflow-y-auto flex-1 min-h-0 py-2 font-sans">
                                {/* Active matter section */}
                                {activeMatter && (
                                    <div className="px-3 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setMatterSectionCollapsed((v) => !v)}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-amber-50/50 transition-colors motion-reduce:transition-none text-left"
                                            aria-expanded={!matterSectionCollapsed}
                                        >
                                            <span className="flex items-center justify-center w-6 h-6 rounded border border-amber-700/30 bg-card text-amber-800 text-[11px] font-serif font-medium shrink-0">
                                                {activeMatter.name.charAt(0).toUpperCase()}
                                            </span>
                                            <span className="flex-1 min-w-0">
                                                <span className="block text-[10px] uppercase tracking-wide text-amber-800/80 font-semibold leading-tight">
                                                    Active matter
                                                </span>
                                                <span className="block text-[13px] font-serif text-foreground truncate leading-tight">
                                                    {activeMatter.name}
                                                </span>
                                            </span>
                                            <ChevronRight
                                                className={`h-3.5 w-3.5 text-muted-foreground transition-transform motion-reduce:transition-none ${
                                                    matterSectionCollapsed ? "" : "rotate-90"
                                                }`}
                                            />
                                        </button>
                                        {!matterSectionCollapsed && (
                                            <div className="mt-1 ml-2 pl-3 border-l border-[#E7E2D6] space-y-0.5">
                                                {matterSubLinks.map(({ href, label, icon: Icon }) => {
                                                    const active = isActiveHref(href);
                                                    return (
                                                        <button
                                                            key={href}
                                                            onClick={() => router.push(href)}
                                                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-left transition-colors motion-reduce:transition-none ${
                                                                active
                                                                    ? "bg-amber-50/70 text-amber-900"
                                                                    : "text-foreground/80 hover:bg-amber-50/40"
                                                            }`}
                                                        >
                                                            <Icon className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate">{label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Favorites */}
                                {favItems.length > 0 && (
                                    <div className="mb-1">
                                        <div className="px-5 py-1 flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                                            <Star className="w-3 h-3" />
                                            <span>{t("nav.favorites") || "Favorites"}</span>
                                        </div>
                                        {favItems.map(({ href, label, labelKey, icon: Icon }) => {
                                            const text = t(labelKey) || label;
                                            const active = isActiveHref(href);
                                            return (
                                                <PanelRow
                                                    key={`fav-${href}`}
                                                    icon={<Icon className="h-3.5 w-3.5 shrink-0" />}
                                                    label={text}
                                                    active={active}
                                                    onClick={() => router.push(href)}
                                                    onFavToggle={() => toggleFavorite(href)}
                                                    isFav
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Pinned */}
                                <div className="mb-1">
                                    <div className="px-5 py-1 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                                        {t("nav.pinned") || "Pinned"}
                                    </div>
                                    {PINNED.map(({ href, label, labelKey, icon: Icon }) => {
                                        const text = t(labelKey) || label;
                                        const active = isActiveHref(href);
                                        return (
                                            <PanelRow
                                                key={href}
                                                icon={<Icon className="h-3.5 w-3.5 shrink-0" />}
                                                label={text}
                                                active={active}
                                                onClick={() => router.push(href)}
                                                onFavToggle={() => toggleFavorite(href)}
                                                isFav={favorites.includes(href)}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Grouped nav */}
                                {NAV_GROUPS.map((group) => {
                                    const collapsed = groupsCollapsed[group.id];
                                    return (
                                        <div key={group.id} className="mt-2">
                                            <button
                                                onClick={() => toggleGroup(group.id)}
                                                className="w-full px-5 py-1 flex items-center justify-between text-[10px] uppercase tracking-wide font-semibold text-muted-foreground hover:text-foreground/80 transition-colors motion-reduce:transition-none"
                                            >
                                                <span>{t(group.labelKey) || group.label}</span>
                                                <ChevronRight
                                                    className={`h-3 w-3 transition-transform motion-reduce:transition-none ${
                                                        !collapsed ? "rotate-90" : ""
                                                    }`}
                                                />
                                            </button>
                                            {!collapsed &&
                                                group.items.map(({ href, label, labelKey, icon: Icon }) => {
                                                    const text = t(labelKey) || label;
                                                    const active = isActiveHref(href);
                                                    return (
                                                        <PanelRow
                                                            key={href}
                                                            icon={<Icon className="h-3.5 w-3.5 shrink-0" />}
                                                            label={text}
                                                            active={active}
                                                            onClick={() => router.push(href)}
                                                            onFavToggle={() => toggleFavorite(href)}
                                                            isFav={favorites.includes(href)}
                                                        />
                                                    );
                                                })}
                                        </div>
                                    );
                                })}

                                {/* Assistant chat history (when on /assistant) */}
                                {pathname.startsWith("/assistant") && (
                                    <div className="mt-4 px-2">
                                        <div className="px-3 py-1 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
                                            {t("nav.assistant_history") || "Assistant History"}
                                        </div>
                                        <div className="mt-1">
                                            {!chats ? (
                                                <div className="space-y-1 px-1">
                                                    {[40, 60, 50, 70, 45].map((w, i) => (
                                                        <div key={i} className="h-8 flex items-center px-3 rounded-md">
                                                            <div className="h-3 bg-muted rounded animate-pulse" style={{ width: `${w}%` }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : chats.length === 0 ? (
                                                <div className="text-xs text-muted-foreground py-2 px-3">No chats yet</div>
                                            ) : (
                                                <div className="space-y-1 px-1">
                                                    {chats.map((chat) => (
                                                        <SidebarChatItem
                                                            key={chat.id}
                                                            chat={chat}
                                                            isActive={currentChatId === chat.id}
                                                            projectName={chat.project_id ? projectNames[chat.project_id] : undefined}
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
                            </div>

                            {/* Profile bar at panel footer */}
                            <div className="border-t border-[#E7E2D6] px-3 py-3 flex items-center gap-2 font-sans">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsDropdownOpen((v) => !v); }}
                                    className="flex items-center gap-2 flex-1 min-w-0 hover:bg-amber-50/40 rounded-md px-2 py-1.5 transition-colors motion-reduce:transition-none"
                                >
                                    <div className="h-7 w-7 flex-shrink-0 rounded-full bg-foreground flex items-center justify-center text-white text-sm font-medium font-serif">
                                        {getUserInitials(user.email)}
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground truncate leading-tight">{getDisplayName()}</div>
                                        <div className="text-[11px] text-muted-foreground truncate leading-tight">{user.email}</div>
                                    </div>
                                    <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                </button>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </>
    );
}

// ── PanelRow — a row in the expanded panel with fav-toggle on hover ──────
interface PanelRowProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick: () => void;
    onFavToggle?: () => void;
    isFav?: boolean;
}

function PanelRow({ icon, label, active, onClick, onFavToggle, isFav }: PanelRowProps) {
    return (
        <div className="px-2.5 py-0.5 group/item">
            <div
                className={`w-full h-8 flex items-center gap-3 px-2.5 py-1.5 rounded-md transition-colors motion-reduce:transition-none ${
                    active ? "bg-amber-50/70 text-amber-900" : "hover:bg-amber-50/40 text-foreground/80"
                }`}
            >
                <button
                    onClick={onClick}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                    {icon}
                    <span className="text-[13px] truncate font-sans">{label}</span>
                </button>
                {onFavToggle && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onFavToggle(); }}
                        className={`transition-opacity motion-reduce:transition-none ${
                            isFav
                                ? "opacity-100 text-amber-600"
                                : "opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-amber-600"
                        }`}
                        aria-label={isFav ? "Unpin from favorites" : "Pin to favorites"}
                        title={isFav ? "Unpin from favorites" : "Pin to favorites"}
                    >
                        <Star className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
                    </button>
                )}
            </div>
        </div>
    );
}
