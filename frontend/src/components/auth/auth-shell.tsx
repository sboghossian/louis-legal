"use client";

import * as React from "react";
import Link from "next/link";
import {
    Sparkles,
    ShieldCheck,
    KeyRound,
    GitBranch,
    Quote,
} from "lucide-react";
import { MarketingTopNav } from "@/components/marketing/marketing-shell";
import { HeroMock } from "@/components/marketing/feature-mocks";

/**
 * Two-column auth shell used by /login and /signup.
 *
 * Left column: form (children).
 * Right column (md+): hero mock + value props + a testimonial-style line.
 *
 * Shares the marketing top-nav so signed-out visitors can hop between
 * login / signup / academy / docs / repo without dead-ending.
 */
export function AuthShell({
    title,
    subtitle,
    sideTitle,
    children,
}: {
    title: string;
    subtitle: string;
    sideTitle: string;
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-dvh bg-[#fbf8f2] text-[#1f2937]">
            <MarketingTopNav />

            {/* Decorative orbs */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-40 -left-32 w-[26rem] h-[26rem] rounded-full bg-amber-200/30 blur-3xl louis-orb"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute top-20 -right-20 w-[26rem] h-[26rem] rounded-full bg-[#c9a961]/15 blur-3xl louis-orb"
                style={{ animationDelay: "5s" }}
            />

            <main className="relative pt-28 md:pt-32 pb-14 px-4 md:px-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
                    {/* Form column */}
                    <div className="lg:col-span-5 order-1">
                        <div className="bg-white border border-[#e7e2d6] rounded-2xl p-7 md:p-8 shadow-[0_18px_50px_-20px_rgba(31,41,55,0.18)]">
                            <h1 className="text-2xl font-serif text-gray-900 mb-1">
                                {title}
                            </h1>
                            <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
                            {children}
                        </div>
                        <p className="text-center text-[11px] text-gray-500 leading-relaxed mt-4 px-2">
                            Demo deployment — please do not upload sensitive, confidential, or privileged client documents.
                        </p>
                    </div>

                    {/* Visual / value-prop column */}
                    <aside className="hidden lg:flex lg:col-span-7 order-2 flex-col gap-5">
                        <div className="louis-float">
                            <HeroMock />
                        </div>

                        <div>
                            <h2 className="text-xl md:text-2xl font-serif font-light tracking-tight leading-snug">
                                {sideTitle}
                            </h2>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <ValueProp
                                    icon={Sparkles}
                                    title="982 expert skills"
                                    body="MENA-first jurisdictions, drafting, review, research, compliance."
                                />
                                <ValueProp
                                    icon={KeyRound}
                                    title="BYO API keys"
                                    body="Claude · Gemini · OpenAI. Your key wins over the server's fallback."
                                />
                                <ValueProp
                                    icon={GitBranch}
                                    title="Fork & self-host"
                                    body="MIT-licensed. Deploy inside your perimeter — documents stay home."
                                />
                                <ValueProp
                                    icon={ShieldCheck}
                                    title="Privilege-aware"
                                    body="Vault AES-256, per-client isolation, audit log on every read."
                                />
                            </div>

                            <blockquote className="mt-5 flex gap-3 items-start text-[13px] text-gray-600 font-serif italic leading-relaxed bg-white/60 backdrop-blur-sm rounded-xl border border-[#e7e2d6] p-4">
                                <Quote className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-1" />
                                <span>
                                    "Forked from Mike, rebuilt around comfort-UI for actual lawyering — the open alternative to Harvey, Legora, and CoCounsel."
                                    <span className="block not-italic text-[11px] text-gray-400 mt-1.5">
                                        — Louis README
                                    </span>
                                </span>
                            </blockquote>
                        </div>
                    </aside>
                </div>
            </main>

            <footer className="px-6 py-6 text-center text-[11px] text-gray-500">
                <Link href="/" className="hover:text-gray-900">
                    ← Back to home
                </Link>
                <span className="mx-3 text-gray-300">·</span>
                <Link href="/academy" className="hover:text-gray-900">
                    Academy
                </Link>
                <span className="mx-3 text-gray-300">·</span>
                <a
                    href="https://github.com/sboghossian/louis-legal"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-gray-900"
                >
                    GitHub
                </a>
            </footer>
        </div>
    );
}

function ValueProp({
    icon: Icon,
    title,
    body,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
}) {
    return (
        <div className="rounded-xl border border-[#e7e2d6] bg-white p-3">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 text-amber-700" />
                <div className="text-sm font-medium text-gray-900">{title}</div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{body}</p>
        </div>
    );
}
