"use client";

/**
 * /reset-password — second leg of the password-reset flow.
 *
 * The Supabase email link redirects here with `#access_token=...&type=recovery`
 * in the URL fragment. The Supabase JS client parses that fragment on init
 * (detectSessionInUrl is on by default) and exchanges it for a real session
 * — so by the time this component mounts, `supabase.auth.getSession()`
 * returns a recovery session and `updateUser({ password })` works without
 * any further plumbing.
 *
 * If the link is expired or has been used already, getSession() returns
 * null and we show an inline "request a new one" error with a link back
 * to /forgot-password.
 *
 * Min password length is 6 characters to match the signup page and the
 * Supabase default. Bump both together if we ever raise it.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { useLocale } from "@/contexts/LocaleContext";

export default function ResetPasswordPage() {
    const router = useRouter();
    const { t } = useLocale();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [hasRecoverySession, setHasRecoverySession] = useState(false);

    // Verify the recovery session arrived intact. Supabase parses the URL
    // fragment on init, so by the time this effect runs the session is
    // either there or the link was bad.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await supabase.auth.getSession();
            if (cancelled) return;
            setHasRecoverySession(!!data.session);
            setSessionChecked(true);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Same strength scorer as signup — keeps both surfaces consistent.
    const strength = useMemo(() => {
        if (!password) return { score: 0, label: "" };
        let s = 0;
        if (password.length >= 8) s++;
        if (password.length >= 12) s++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
        if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) s++;
        return {
            score: s,
            label:
                s <= 1
                    ? "Too short — aim for 12+"
                    : s === 2
                      ? "OK — could be stronger"
                      : s === 3
                        ? "Strong"
                        : "Excellent",
        };
    }, [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => router.push("/home"), 1500);
        } catch (err: unknown) {
            const msg =
                err instanceof Error ? err.message : "Failed to update password";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title={t("auth.reset.title")}
            subtitle={t("auth.reset.subtitle")}
            sideTitle="Your firm's legal AI, in a codebase you can read line by line."
        >
            {success ? (
                <div className="text-center py-4">
                    <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-700">
                        {t("auth.reset.success")}
                    </p>
                </div>
            ) : sessionChecked && !hasRecoverySession ? (
                <div className="space-y-4">
                    <div
                        role="alert"
                        className="text-amber-800 text-sm bg-amber-50 border border-amber-200 p-3 rounded-lg leading-relaxed"
                    >
                        {t("auth.reset.expired")}
                    </div>
                    <Link
                        href="/forgot-password"
                        className="block text-center text-sm text-gray-900 font-medium underline-offset-2 hover:underline"
                    >
                        {t("auth.forgot.title")}
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-xs font-medium text-gray-700 mb-1"
                        >
                            {t("auth.reset.password_label")}
                        </label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                required
                                autoComplete="new-password"
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                        {password && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 grid grid-cols-4 gap-1">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1 rounded-full transition-colors ${
                                                i < strength.score
                                                    ? strength.score === 1
                                                        ? "bg-red-400"
                                                        : strength.score === 2
                                                          ? "bg-amber-400"
                                                          : strength.score === 3
                                                            ? "bg-emerald-400"
                                                            : "bg-emerald-500"
                                                    : "bg-gray-200"
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-[10px] text-gray-500 w-24 text-right">
                                    {strength.label}
                                </span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="block text-xs font-medium text-gray-700 mb-1"
                        >
                            {t("auth.reset.confirm_label")}
                        </label>
                        <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm"
                            required
                            autoComplete="new-password"
                        />
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
                        disabled={loading || !sessionChecked}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11"
                    >
                        {loading ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {t("auth.reset.submit")}…
                            </span>
                        ) : (
                            t("auth.reset.submit")
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
