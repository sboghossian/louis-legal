"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { LouisWordmark } from "@/components/brand/louis-mark";
import { useAuth } from "@/contexts/AuthContext";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function LoginPage() {
    const router = useRouter();
    const { isAuthenticated, authLoading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
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
            setError((error as Error).message || "An error occurred during sign-in");
        } finally {
            setLoading(false);
        }
    };

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
                        <h2 className="text-xl font-serif text-gray-900">Welcome back</h2>
                        <div className="bg-gray-100 p-1 rounded-md flex text-xs font-medium">
                            <span className="px-3 py-1 bg-white rounded-sm shadow-sm text-gray-900">Sign in</span>
                            <Link href="/signup" className="px-3 py-1 text-gray-500 hover:text-gray-900">Sign up</Link>
                        </div>
                    </div>

                    <OAuthButtons mode="signin" />

                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">or with email</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <form onSubmit={handleLogin} className="space-y-3">
                        <div>
                            <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                        </div>

                        {error && (
                            <div className="text-red-700 text-xs bg-red-50 border border-red-200 p-2 rounded">{error}</div>
                        )}

                        <Button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                            {loading ? "Signing in…" : "Sign in"}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-[11px] text-gray-500 leading-relaxed mt-4 px-2">
                    Demo deployment — please do not upload sensitive, confidential, or privileged client documents.
                </p>
            </div>
        </div>
    );
}
