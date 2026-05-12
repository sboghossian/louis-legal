"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { LouisWordmark } from "@/components/brand/louis-mark";
import { CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signupViaServer, updateUserProfile } from "@/app/lib/louisApi";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function SignupPage() {
    const router = useRouter();
    const { isAuthenticated, authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const [organisation, setOrganisation] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!authLoading && isAuthenticated && !success) {
            router.replace("/onboarding");
        }
    }, [authLoading, isAuthenticated, router, success]);

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
            // 1) Try the service-role signup endpoint first. This bypasses
            //    Supabase's email-confirmation gate + the built-in SMTP
            //    rate limit, which were silently blocking new users.
            const serverResult = await signupViaServer({
                email,
                password,
                ...(trimmedName && { displayName: trimmedName }),
                ...(trimmedOrg && { organisation: trimmedOrg }),
            });

            if (serverResult.ok) {
                // Account exists + is email-confirmed. Sign them in to
                // mint a real session client-side.
                const { error: signInError } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });
                if (signInError) throw signInError;
                setSuccess(true);
                setTimeout(() => router.push("/onboarding"), 1500);
                return;
            }

            // 2) Conflict (email already exists) is its own user-facing
            //    case — point them at sign-in instead of looping the form.
            if (serverResult.status === 409) {
                setError(serverResult.detail);
                return;
            }

            // 3) If the server endpoint isn't reachable (CORS, offline,
            //    server not deployed yet), fall back to the direct
            //    Supabase client signup so single-instance dev still works.
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) throw error;

            if (data.session) {
                if (trimmedName || trimmedOrg) {
                    try {
                        await updateUserProfile({
                            ...(trimmedName && { displayName: trimmedName }),
                            ...(trimmedOrg && { organisation: trimmedOrg }),
                        });
                    } catch (profileError) {
                        console.error(
                            "[signup] failed to persist profile fields",
                            profileError,
                        );
                    }
                }
                setSuccess(true);
                setTimeout(() => router.push("/onboarding"), 1500);
            } else {
                // No session means Supabase queued a confirmation email.
                // Surface clearly so the user doesn't sit at a blank screen.
                setError(
                    "Account created. Check your inbox for a confirmation email — if it doesn't arrive within a minute, ask the admin to disable email confirmation in Supabase.",
                );
            }
        } catch (error: unknown) {
            setError(
                error instanceof Error
                    ? error.message
                    : "An error occurred during signup",
            );
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-dvh bg-[color:var(--louis-cream)] flex items-center justify-center px-6">
                <div className="bg-white border border-[color:var(--louis-rule)] rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
                    <div className="mx-auto w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-serif text-gray-900 mb-3">Welcome.</h2>
                    <p className="text-gray-600">We&apos;ll get you set up in a moment…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-[color:var(--louis-cream)] flex items-start justify-center px-6 pt-16 pb-10">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Link href="/" aria-label="Louis home">
                        <LouisWordmark size={28} />
                    </Link>
                </div>

                <div className="bg-white border border-[color:var(--louis-rule)] rounded-2xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-serif text-gray-900">Create account</h2>
                        <div className="bg-gray-100 p-1 rounded-md flex text-xs font-medium">
                            <Link href="/login" className="px-3 py-1 text-gray-500 hover:text-gray-900">Sign in</Link>
                            <span className="px-3 py-1 bg-white rounded-sm shadow-sm text-gray-900">Sign up</span>
                        </div>
                    </div>

                    {/* OAuth */}
                    <OAuthButtons mode="signup" />

                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">or with email</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <form onSubmit={handleSignup} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                                    Name <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <Input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                            </div>
                            <div>
                                <label htmlFor="organisation" className="block text-xs font-medium text-gray-700 mb-1">
                                    Organisation <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <Input id="organisation" type="text" value={organisation} onChange={e => setOrganisation(e.target.value)} placeholder="Firm name" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required />
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700 mb-1">Confirm password</label>
                            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm" required />
                        </div>

                        {error && (
                            <div className="text-red-700 text-xs bg-red-50 border border-red-200 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                            {loading ? "Creating account…" : "Sign up with email"}
                        </Button>
                    </form>

                    <div className="mt-4 text-center text-[11px] text-gray-500">
                        By signing up, you agree to our{" "}
                        <Link href="/terms" className="text-gray-700 underline">Terms</Link>
                        {" "}and{" "}
                        <Link href="/privacy" className="text-gray-700 underline">Privacy Policy</Link>.
                    </div>
                </div>

                <p className="text-center text-[11px] text-gray-500 leading-relaxed mt-4 px-2">
                    Demo deployment — please do not upload sensitive, confidential, or privileged client documents.
                </p>
            </div>
        </div>
    );
}
