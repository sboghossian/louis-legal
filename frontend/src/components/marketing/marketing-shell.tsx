import * as React from "react";
import Link from "next/link";
import { Github } from "lucide-react";
import { LouisMark, LouisWordmark } from "@/components/brand/louis-mark";

const REPO_URL = "https://github.com/sboghossian/louis-legal";

export function MarketingShell({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`relative min-h-dvh bg-[#fbf8f2] text-[#1f2937] ${className ?? ""}`}>
            <MarketingTopNav />
            {children}
            <MarketingFooter />
        </div>
    );
}

export function MarketingTopNav() {
    return (
        <nav className="fixed inset-x-0 top-4 md:top-5 z-50 flex justify-center px-3 md:px-4">
            <div className="relative w-full max-w-6xl">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-x-6 -inset-y-2 rounded-full bg-white/30 blur-2xl"
                />
                <div
                    className="relative flex items-center justify-between gap-2 rounded-full border border-white/40 pl-1.5 pr-2 py-2 backdrop-blur-lg backdrop-saturate-150"
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(251,248,242,0.7) 0%, rgba(231,226,214,0.55) 100%)",
                        boxShadow:
                            "0 1px 0 0 rgba(255,255,255,0.5) inset, 0 -1px 0 0 rgba(0,0,0,0.03) inset, 0 1px 2px rgba(17,24,39,0.04), 0 12px 32px -8px rgba(17,24,39,0.08)",
                    }}
                >
                    <Link href="/" aria-label="Louis home" className="flex items-center gap-2 pl-2 pr-1">
                        <LouisWordmark size={22} />
                    </Link>
                    <div className="hidden md:flex items-center gap-1 text-sm text-gray-700">
                        <NavLink href="/#features">Features</NavLink>
                        <NavLink href="/#open-source">Why open source</NavLink>
                        <NavLink href="/academy">Academy</NavLink>
                        <NavLink href={REPO_URL} external>
                            GitHub
                        </NavLink>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2">
                        <Link
                            href="/login"
                            className="px-3 md:px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-full"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/signup"
                            className="px-3 md:px-3.5 py-1.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-full transition-colors"
                        >
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}

function NavLink({
    href,
    children,
    external = false,
}: {
    href: string;
    children: React.ReactNode;
    external?: boolean;
}) {
    return external ? (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors"
        >
            {children}
        </a>
    ) : (
        <Link
            href={href}
            className="px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors"
        >
            {children}
        </Link>
    );
}

export function MarketingFooter() {
    return (
        <footer className="px-6 py-10 bg-[#fbf8f2]">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-[#e7e2d6]">
                    <Link href="/" aria-label="Louis home" className="inline-flex">
                        <LouisWordmark size={22} />
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                        <Link href="/academy" className="hover:text-gray-900">
                            Academy
                        </Link>
                        <Link href="/about" className="hover:text-gray-900">
                            About
                        </Link>
                        <Link href="/transparency" className="hover:text-gray-900">
                            Transparency
                        </Link>
                        <a
                            href={REPO_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 hover:text-gray-900"
                        >
                            <Github className="h-3.5 w-3.5" />
                            GitHub
                        </a>
                        <Link href="/login" className="hover:text-gray-900">
                            Log in
                        </Link>
                        <Link href="/signup" className="hover:text-gray-900 font-medium">
                            Sign up
                        </Link>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 pt-6 text-xs text-gray-500">
                    <span>
                        © {new Date().getFullYear()} Louis. MIT licensed. Forked from{" "}
                        <a
                            href="https://github.com/willchen96/mike"
                            target="_blank"
                            rel="noreferrer"
                            className="underline hover:text-gray-900"
                        >
                            Mike
                        </a>
                        .
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <LouisMark size={14} />
                        <span>Made in Beirut + Dubai</span>
                    </span>
                </div>
            </div>
        </footer>
    );
}
