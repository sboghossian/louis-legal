"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ChatHistoryProvider } from "@/app/contexts/ChatHistoryContext";
import { SidebarContext } from "@/app/contexts/SidebarContext";
import { AppSidebar } from "@/app/components/shared/AppSidebar";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// Paths that don't require completed onboarding
const ONBOARDING_EXEMPT = ["/onboarding", "/about", "/docs", "/login", "/signup"];

export default function LouisLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, authLoading } = useAuth();
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

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [authLoading, isAuthenticated, router]);

    // Onboarding gating: check if user has completed onboarding; if not + on a non-exempt path, redirect.
    useEffect(() => {
        if (authLoading || !isAuthenticated) return;
        if (onboardingChecked) return;
        if (ONBOARDING_EXEMPT.some(p => pathname?.startsWith(p))) {
            setOnboardingChecked(true);
            return;
        }
        // Fast-path: localStorage flag set on completion
        if (typeof window !== "undefined" && localStorage.getItem("louis.onboarded") === "true") {
            setOnboardingChecked(true);
            return;
        }
        (async () => {
            try {
                const r = await fetch(`${API_BASE}/api/onboarding/me`, { headers: { "x-user-id": "demo" } });
                if (r.ok) {
                    const j = await r.json();
                    if (!j.complete) {
                        router.push("/onboarding");
                    } else if (typeof window !== "undefined") {
                        localStorage.setItem("louis.onboarded", "true");
                    }
                }
            } catch { /* backend offline — allow */ }
            setOnboardingChecked(true);
        })();
    }, [authLoading, isAuthenticated, pathname, router, onboardingChecked]);

    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    return (
        <ChatHistoryProvider>
            <SidebarContext.Provider
                value={{ setSidebarOpen: (open) => { setIsSidebarOpen(open); setIsSidebarOpenDesktop(open); } }}
            >
                <div className="h-dvh bg-white flex flex-col">
                    <div className="flex-1 flex overflow-hidden">
                        <AppSidebar
                            isOpen={isSidebarOpen}
                            onToggle={handleSidebarToggle}
                        />
                        <div className="flex-1 flex flex-col h-dvh md:overflow-hidden relative w-full">
                            {/* Mobile header */}
                            <div className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
                                <button
                                    onClick={handleSidebarToggle}
                                    className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                                >
                                    <Menu className="h-5 w-5" />
                                </button>
                            </div>
                            <main className="flex-1 overflow-y-auto md:overflow-hidden w-full h-full">
                                {children}
                            </main>
                        </div>
                    </div>
                </div>
            </SidebarContext.Provider>
        </ChatHistoryProvider>
    );
}
