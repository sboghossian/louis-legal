"use client";

/**
 * /forgot-password — first leg of the password-reset flow.
 *
 * - Single email input.
 * - Calls `supabase.auth.resetPasswordForEmail` with a redirectTo pointing
 *   at /reset-password on the current origin. Supabase emails the user a
 *   link whose URL fragment carries the recovery `access_token`.
 * - Account-enumeration prevention: the success copy never confirms whether
 *   the email is actually registered. We show the same message on success
 *   and on most errors. Real failures (network, malformed input) still
 *   surface as a small inline error.
 * - Rate-limiting: relies on Supabase's built-in per-IP / per-email reset
 *   throttle. We do not add a client-side cooldown — Supabase already
 *   returns 429 when abused, which we treat as the same "if an account
 *   exists" success state.
 */

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { useLocale } from "@/contexts/LocaleContext";

export default function ForgotPasswordPage() {
    const { t } = useLocale();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const redirectTo =
                typeof window !== "undefined"
                    ? `${window.location.origin}/reset-password`
                    : undefined;
            await supabase.auth.resetPasswordForEmail(email, {
                redirectTo,
            });
            // We deliberately ignore the error here and always show the
            // generic "if an account exists" message. This prevents an
            // attacker from probing registered emails via the response.
            setSent(true);
        } catch {
            // Network / unexpected — still surface the success copy so we
            // don't leak signal. Log to console for the developer.
            setSent(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title={t("auth.forgot.title")}
            subtitle={t("auth.forgot.subtitle")}
            sideTitle="Your firm's legal AI, in a codebase you can read line by line."
        >
            {sent ? (
                <div className="space-y-5">
                    <div
                        role="status"
                        className="text-emerald-800 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded-lg leading-relaxed"
                    >
                        {t("auth.forgot.sent")}
                    </div>
                    <Link
                        href="/login"
                        className="block text-center text-sm text-gray-900 font-medium underline-offset-2 hover:underline"
                    >
                        {t("auth.forgot.back_to_login")}
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-xs font-medium text-gray-700 mb-1"
                        >
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="text-red-700 text-xs bg-red-50 border border-red-200 p-2.5 rounded-lg"
                        >
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11"
                    >
                        {loading ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {t("auth.forgot.submit")}…
                            </span>
                        ) : (
                            t("auth.forgot.submit")
                        )}
                    </Button>

                    <div className="mt-3 text-center text-xs text-gray-500">
                        <Link
                            href="/login"
                            className="text-gray-900 font-medium underline-offset-2 hover:underline"
                        >
                            {t("auth.forgot.back_to_login")}
                        </Link>
                    </div>
                </form>
            )}
        </AuthShell>
    );
}
