"use client";

/**
 * MobileBottomNav — a 5-tab strip pinned to the bottom on screens
 * narrower than 640px. The desktop sidebar collapses to a slide-out
 * menu on mobile; the bottom strip handles the actually-frequent
 * actions so users don't need to open the side menu for routine
 * navigation.
 *
 * Routes pinned: Assistant · Newsfeed · Projects · Inbox · Menu
 * (Menu opens the full sidebar; controlled by the parent layout via
 * the SidebarContext setSidebarOpen.)
 */

import { useRouter, usePathname } from "next/navigation";
import {
    MessageSquare,
    Rss,
    FolderOpen,
    Inbox,
    Menu as MenuIcon,
    type LucideIcon,
} from "lucide-react";
import { useSidebar } from "@/app/contexts/SidebarContext";

interface Tab {
    href?: string;
    label: string;
    icon: LucideIcon;
    onClick?: () => void;
    matchPrefix?: string;
}

export function MobileBottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { setSidebarOpen } = useSidebar();

    const tabs: Tab[] = [
        {
            href: "/assistant",
            label: "Assistant",
            icon: MessageSquare,
            matchPrefix: "/assistant",
        },
        {
            href: "/feed",
            label: "News",
            icon: Rss,
            matchPrefix: "/feed",
        },
        {
            href: "/projects",
            label: "Projects",
            icon: FolderOpen,
            matchPrefix: "/projects",
        },
        {
            href: "/inbox",
            label: "Inbox",
            icon: Inbox,
            matchPrefix: "/inbox",
        },
        {
            label: "Menu",
            icon: MenuIcon,
            onClick: () => setSidebarOpen(true),
        },
    ];

    return (
        <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 flex items-stretch"
            // Respect iOS safe area so the strip clears the home indicator.
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            aria-label="Primary navigation"
        >
            {tabs.map((t) => {
                const isActive = t.matchPrefix
                    ? pathname === t.matchPrefix ||
                      pathname?.startsWith(t.matchPrefix + "/") ||
                      false
                    : false;
                const Icon = t.icon;
                return (
                    <button
                        key={t.label}
                        type="button"
                        onClick={() => {
                            if (t.onClick) t.onClick();
                            else if (t.href) router.push(t.href);
                        }}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors ${
                            isActive
                                ? "text-gray-900"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                        aria-label={t.label}
                        aria-current={isActive ? "page" : undefined}
                    >
                        <Icon className="h-5 w-5" />
                        <span className="leading-none">{t.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
