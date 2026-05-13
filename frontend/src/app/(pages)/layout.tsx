"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHistoryProvider } from "@/app/contexts/ChatHistoryContext";
import { SidebarContext } from "@/app/contexts/SidebarContext";
import { AppSidebar } from "@/app/components/shared/AppSidebar";
import { CommandPalette } from "@/app/components/shared/CommandPalette";
import { MobileBottomNav } from "@/app/components/shared/MobileBottomNav";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { supabase } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// Paths inside (pages)/ that don't gate on onboarding completion.
// Note: /onboarding lives outside (pages)/ now, so this layout doesn't apply there.
const ONBOARDING_EXEMPT = ["/about", "/docs", "/academy", "/help"];

// Paths inside (pages)/ that are publicly readable — no auth required.
// Used by anyone browsing the marketing/learning surfaces. Signed-in users
// still see them inside the normal app chrome; signed-out users see them
// wrapped in the marketing shell (top nav + footer).
const PUBLIC_PATHS = ["/academy", "/about", "/transparency"];

export default function LouisLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, authLoading, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [onboardingChecked, setOnboardingChecked] = useState(false);

    const [isSidebarOpenDesktop, setIsSidebarOpenDesktop] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("sidebarOpen");
            return saved !== null ? saved === "true" : true;
        }
        return true;
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window !== "undefined" && window.innerWidth < 768) {
            return false;
        }
        return true;
    });

    useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth >= 768) {
            localStorage.setItem("sidebarOpen", isSidebarOpen.toString());
        }
    }, [isSidebarOpenDesktop]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleResize = () => {
            const isSmall = window.innerWidth < 768;
            if (isSmall && isSidebarOpen) setIsSidebarOpen(false);
            else if (!isSmall && !isSidebarOpen)
                setIsSidebarOpen(isSidebarOpenDesktop);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [isSidebarOpen, isSidebarOpenDesktop]);

    const handleSidebarToggle = () => {
        if (window.innerWidth >= 768) {
            setIsSidebarOpenDesktop(!isSidebarOpenDesktop);
            setIsSidebarOpen(!isSidebarOpenDesktop);
        } else {
            setIsSidebarOpen(!isSidebarOpen);
        }
    };

    const isPublicPath = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));

    useEffect(() => {
        if (!authLoading && !isAuthenticated && !isPublicPath) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router, isPublicPath]);

    // Onboarding gating: check if user has completed onboarding; if not + on a non-exempt path, redirect.
    useEffect(() => {
        if (authLoading || !isAuthenticated || !user?.id) return;
        if (onboardingChecked) return;
        if (ONBOARDING_EXEMPT.some(p => pathname?.startsWith(p))) {
            setOnboardingChecked(true);
            return;
        }
        // Fast-path: per-user localStorage flag. Namespaced by user id so a
        // shared device doesn't leak one user's "onboarded" state to the next.
        const flagKey = `louis.onboarded:${user.id}`;
        if (typeof window !== "undefined" && localStorage.getItem(flagKey) === "true") {
            setOnboardingChecked(true);
            return;
        }
        (async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) {
                    // Auth context says we're signed in but there's no
                    // active token — let the user proceed (the backend
                    // will reject anything that requires a real session
                    // and the rest of the app handles that path).
                    setOnboardingChecked(true);
                    return;
                }
                const r = await fetch(`${API_BASE}/api/onboarding/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (r.ok) {
                    const j = await r.json();
                    if (!j.complete) {
                        router.push("/onboarding");
                    } else if (typeof window !== "undefined") {
                        localStorage.setItem(flagKey, "true");
                    }
                }
            } catch { /* backend offline — allow */ }
            setOnboardingChecked(true);
        })();
    }, [authLoading, isAuthenticated, user?.id, pathname, router, onboardingChecked]);

    // Public paths (academy, about) render content immediately so the
    // initial HTML carries SEO-relevant copy and we don't gate them
    // behind a session lookup. Once auth resolves, signed-in visitors
    // see the marketing chrome around the content (they can still hop
    // back into the app via the top nav); signed-out visitors are
    // already in the right state.
    if (isPublicPath) {
        return (
            <MarketingShell>
                <main className="pt-24 md:pt-28">{children}</main>
            </MarketingShell>
        );
    }

    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <ChatHistoryProvider>
            <SidebarContext.Provider
                value={{ setSidebarOpen: (open) => { setIsSidebarOpen(open); setIsSidebarOpenDesktop(open); } }}
            >
                <div className="h-dvh bg-card flex flex-col">
                    <div className="flex-1 flex overflow-hidden">
                        <AppSidebar
                            isOpen={isSidebarOpen}
                            onToggle={handleSidebarToggle}
                        />
                        <div className="flex-1 flex flex-col h-dvh md:overflow-hidden relative w-full">
                            {/* Mobile header */}
                            <div className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                                <button
                                    onClick={handleSidebarToggle}
                                    className="flex items-center justify-center w-8 h-8 rounded hover:bg-muted text-muted-foreground transition-colors"
                                >
                                    <Menu className="h-5 w-5" />
                                </button>
                            </div>
                            {/* Pages scroll by default. Full-bleed surfaces
                                like the assistant chat manage their own
                                overflow with an inner overflow-y-auto. */}
                            {/* pb-16 on mobile clears the bottom tab nav so
                                content isn't hidden under it. md+ has no
                                bottom nav so no padding needed. */}
                            <main className="flex-1 overflow-y-auto w-full h-full pb-16 md:pb-0">
                                {children}
                            </main>
                            {/* Global Cmd/Ctrl+K palette — captures the
                                shortcut from any focus inside (pages). */}
                            <CommandPalette />
                            {/* Mobile-only bottom tab strip; hidden on md+. */}
                            <MobileBottomNav />
                        </div>
                    </div>
                </div>
            </SidebarContext.Provider>
        </ChatHistoryProvider>
    );
}
