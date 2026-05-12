"use client";

/**
 * Client-only island for the landing page.
 *
 * The landing page itself is server-rendered (so its content is in the
 * initial HTML for SEO + faster FCP). The only thing that needs to run
 * on the client is the "if signed in, jump to /assistant" redirect.
 * This component handles that and renders nothing.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function LandingAuthRedirect() {
    const { isAuthenticated, authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace("/assistant");
        }
    }, [authLoading, isAuthenticated, router]);

    return null;
}
