"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LouisMark } from "@/components/brand/louis-mark";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState<"working" | "ok" | "error">("working");
    const [message, setMessage] = useState("Completing sign-in…");

    useEffect(() => {
        (async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (!data.session) {
                    // Supabase JS auto-detects the OAuth code in the URL and exchanges it.
                    // If no session yet, wait briefly then re-check.
                    await new Promise(r => setTimeout(r, 800));
                    const second = await supabase.auth.getSession();
                    if (!second.data.session) {
                        throw new Error("No session returned. The OAuth provider may not be enabled in Supabase.");
                    }
                }
                setStatus("ok");
                setMessage("Welcome to Louis.");
                // Decide next: onboarding vs home
                router.replace("/onboarding");
            } catch (e) {
                setStatus("error");
                setMessage((e as Error).message || "Sign-in failed.");
            }
        })();
    }, [router]);

    return (
        <div className="min-h-dvh flex items-center justify-center bg-[color:var(--louis-cream)] p-6">
            <div className="max-w-md text-center">
                <LouisMark size={48} className="mx-auto mb-6" />
                <div className={`text-lg font-serif mb-2 ${status === "error" ? "text-red-700" : "text-gray-900"}`}>
                    {message}
                </div>
                {status === "working" && (
                    <div className="mt-4 inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-800" />
                )}
                {status === "error" && (
                    <div className="mt-4">
                        <a href="/login" className="text-sm text-blue-700 underline">Back to sign-in</a>
                    </div>
                )}
            </div>
        </div>
    );
}
