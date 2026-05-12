"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import { LouisMark } from "@/components/brand/louis-mark";
import { useAuth } from "@/contexts/AuthContext";
import { signupViaServer, updateUserProfile } from "@/app/lib/louisApi";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignupPage() {
    const router = useRouter();
    const { isAuthenticated, authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const [organisation, setOrganisation] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!authLoading && isAuthenticated && !success) {
            router.replace("/onboarding");
        }
    }, [authLoading, isAuthenticated, router, success]);

    /**
     * Lightweight password strength scorer. Returns a label + 0–4 bars.
     * Hidden until the user starts typing — never shamed for short inputs.
     */
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
                s <= 1 ? "Too short — aim for 12+" :
                s === 2 ? "OK — could be stronger" :
                s === 3 ? "Strong" :
                "Excellent",
        };
    }, [password]);

    const handleSignup = async (e: React.FormEvent) => {
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

        const trimmedName = name.trim();
        const trimmedOrg = organisation.trim();

        try {
            const serverResult = await signupViaServer({
                email,
                password,
                ...(trimmedName && { displayName: trimmedName }),
                ...(trimmedOrg && { organisation: trimmedOrg }),
            });

            if (serverResult.ok) {
                const { error: signInError } =
                    await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
                setSuccess(true);
                setTimeout(() => router.push("/onboarding"), 1200);
                return;
            }

            if (serverResult.status === 409) {
                setError(`${serverResult.detail} — try signing in instead.`);
                return;
            }

            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;

            if (data.session) {
                if (trimmedName || trimmedOrg) {
                    try {
                        await updateUserProfile({
                            ...(trimmedName && { displayName: trimmedName }),
                            ...(trimmedOrg && { organisation: trimmedOrg }),
                        });
                    } catch (profileError) {
                        console.error("[signup] failed to persist profile fields", profileError);
                    }
                }
                setSuccess(true);
                setTimeout(() => router.push("/onboarding"), 1200);
            } else {
                setError(
                    "Account created. Check your inbox for a confirmation email — if it doesn't arrive within a minute, ask the admin to disable email confirmation in Supabase.",
                );
            }
        } catch (error: unknown) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong during signup",
            );
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-dvh bg-[#fbf8f2] flex items-center justify-center px-6">
                <div className="bg-white border border-[#e7e2d6] rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
                    <LouisMark size={48} className="mx-auto mb-5" />
                    <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-5">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-serif text-gray-900 mb-2">Welcome.</h2>
                    <p className="text-gray-600 text-sm">
                        We&apos;ll get you set up in a moment…
                    </p>
                </div>
            </div>
        );
    }

    return (
        <AuthShell
            title="Create your account"
            subtitle="Free forever for individuals. Bring your own AI keys."
            sideTitle="Spin up the workbench in 30 seconds — Google, Microsoft, or email."
        >
            <div className="flex items-center justify-end mb-4 -mt-2">
                <div className="bg-gray-100 p-1 rounded-md flex text-xs font-medium">
                    <Link
                        href="/login"
                        className="px-3 py-1 text-gray-500 hover:text-gray-900"
                    >
                        Sign in
                    </Link>
                    <span className="px-3 py-1 bg-white rounded-sm shadow-sm text-gray-900">
                        Sign up
                    </span>
                </div>
            </div>

            <OAuthButtons mode="signup" />

            <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
                    or with email
                </span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleSignup} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                            Name <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            autoComplete="name"
                        />
                    </div>
                    <div>
                        <label htmlFor="organisation" className="block text-xs font-medium text-gray-700 mb-1">
                            Organisation <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <Input
                            id="organisation"
                            type="text"
                            value={organisation}
                            onChange={(e) => setOrganisation(e.target.value)}
                            placeholder="Firm name"
                            autoComplete="organization"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
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
                    <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">
                        Password
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
                    {password && (
                        <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 grid grid-cols-4 gap-1">
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className={`h-1 rounded-full transition-colors ${
                                            i < strength.score
                                                ? strength.score === 1 ? "bg-red-400"
                                                : strength.score === 2 ? "bg-amber-400"
                                                : strength.score === 3 ? "bg-emerald-400"
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
                    <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700 mb-1">
                        Confirm password
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
                    disabled={loading}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11"
                >
                    {loading ? (
                        <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Creating account…
                        </span>
                    ) : (
                        "Sign up with email"
                    )}
                </Button>
            </form>

            <div className="mt-4 text-center text-[11px] text-gray-500">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="text-gray-700 underline">Terms</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-gray-700 underline">Privacy Policy</Link>.
            </div>

            <div className="mt-3 text-center text-xs text-gray-500">
                Already have an account?{" "}
                <Link
                    href="/login"
                    className="text-gray-900 font-medium underline-offset-2 hover:underline"
                >
                    Sign in
                </Link>
            </div>
        </AuthShell>
    );
}
