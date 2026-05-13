"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AuthShell } from "@/components/auth/auth-shell";
import { useLocale } from "@/contexts/LocaleContext";

export default function LoginPage() {
    const router = useRouter();
    const { t } = useLocale();
    const { isAuthenticated, authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace("/home");
        }
    }, [authLoading, isAuthenticated, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            router.push("/home");
        } catch (error: unknown) {
            const msg = (error as Error).message || "Sign-in failed";
            // Friendlier copy for the most common Supabase auth errors.
            if (/invalid login/i.test(msg)) {
                setError("That email + password combination isn't recognized. Double-check, or use one of the social providers above.");
            } else if (/email not confirmed/i.test(msg)) {
                setError("Your email isn't confirmed yet — check your inbox.");
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Sign in to your Louis workbench."
            sideTitle="Your firm's legal AI, in a codebase you can read line by line."
        >
            <div className="flex items-center justify-end mb-4 -mt-2">
                <div className="bg-gray-100 p-1 rounded-md flex text-xs font-medium">
                    <span className="px-3 py-1 bg-white rounded-sm shadow-sm text-gray-900">
                        Sign in
                    </span>
                    <Link
                        href="/signup"
                        className="px-3 py-1 text-gray-500 hover:text-gray-900"
                    >
                        Sign up
                    </Link>
                </div>
            </div>

            <OAuthButtons mode="signin" />

            <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
                    or with email
                </span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleLogin} className="space-y-3">
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
                <div>
                    <div className="flex items-baseline justify-between mb-1">
                        <label
                            htmlFor="password"
                            className="text-xs font-medium text-gray-700"
                        >
                            Password
                        </label>
                        <Link
                            href="/forgot-password"
                            className="text-[11px] text-gray-500 hover:text-gray-700"
                        >
                            {t("auth.login.forgot")}
                        </Link>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        >
                            {showPassword ? (
                                <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                                <Eye className="w-3.5 h-3.5" />
                            )}
                        </button>
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
                            Signing in…
                        </span>
                    ) : (
                        "Sign in"
                    )}
                </Button>
            </form>

            <div className="mt-5 text-center text-xs text-gray-500">
                New to Louis?{" "}
                <Link
                    href="/signup"
                    className="text-gray-900 font-medium underline-offset-2 hover:underline"
                >
                    Create a free account
                </Link>
            </div>
        </AuthShell>
    );
}
