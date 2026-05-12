"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function OAuthButtons({ mode = "signin" }: { mode?: "signin" | "signup" }) {
    const [loading, setLoading] = useState<"google" | "azure" | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function go(provider: "google" | "azure") {
        setLoading(provider);
        setError(null);
        try {
            const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo,
                    queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
                    scopes: provider === "azure" ? "email profile openid" : undefined,
                },
            });
            if (error) throw error;
        } catch (e) {
            setError((e as Error).message || `${provider} ${mode} failed`);
            setLoading(null);
        }
        // success path redirects away — no need to clear loading state
    }

    const verb = mode === "signup" ? "Sign up" : "Sign in";
    return (
        <div className="space-y-2.5">
            <button
                onClick={() => go("google")}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 h-11 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition text-sm font-medium text-gray-800 disabled:opacity-50 shadow-sm"
                type="button"
                aria-label={`${verb} with Google`}
            >
                <GoogleLogo />
                {loading === "google" ? "Redirecting…" : `${verb} with Google`}
            </button>
            <button
                onClick={() => go("azure")}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 h-11 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition text-sm font-medium text-gray-800 disabled:opacity-50 shadow-sm"
                type="button"
                aria-label={`${verb} with Microsoft`}
            >
                <MicrosoftLogo />
                {loading === "azure" ? "Redirecting…" : `${verb} with Microsoft`}
            </button>
            {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                    {error}
                    <div className="mt-1 text-[10px] opacity-70">
                        OAuth providers must be enabled in Supabase → Authentication → Providers.
                    </div>
                </div>
            )}
        </div>
    );
}

function GoogleLogo() {
    return (
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 18.9 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.7 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.1 4.1-3.9 5.6l6.2 5.2c-.4.4 6.4-4.7 6.4-14.8 0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
    );
}

function MicrosoftLogo() {
    return (
        <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden>
            <path fill="#f25022" d="M1 1h10v10H1z"/>
            <path fill="#7fba00" d="M12 1h10v10H12z"/>
            <path fill="#00a4ef" d="M1 12h10v10H1z"/>
            <path fill="#ffb900" d="M12 12h10v10H12z"/>
        </svg>
    );
}
