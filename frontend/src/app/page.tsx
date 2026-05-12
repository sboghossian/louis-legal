"use client";

/**
 * Marketing landing page for legal.dashable.dev (the root URL).
 *
 * Signed-in visitors get bounced straight to /assistant — the workbench
 * is what they came back for. Anonymous visitors see this surface: hero
 * with a generated Louis illustration, feature grid, "why open source",
 * footer with GitHub + Academy + Privacy links.
 *
 * The hero illustration lives at /public/hero-louis.svg. To replace it
 * with an AI-generated image, drop a new file at the same path (jpg/png
 * fine — just keep the aspect ratio close to 16:10 so the layout holds).
 */

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Github,
    ArrowRight,
    MessageSquare,
    FileText,
    Table2,
    Network,
    Library,
    BookOpenCheck,
    ShieldCheck,
    KeyRound,
    Server,
    GitBranch,
    Eye,
    Rss,
    BookMarked,
    Lock,
    Briefcase,
} from "lucide-react";
import { LouisMark, LouisWordmark } from "@/components/brand/louis-mark";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const REPO_URL = "https://github.com/sboghossian/louis-legal";

export default function LandingPage() {
    const { isAuthenticated, authLoading } = useAuth();
    const router = useRouter();

    // Signed-in users skip the marketing surface and go straight to the app.
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace("/assistant");
        }
    }, [authLoading, isAuthenticated, router]);

    if (authLoading) {
        return (
            <div className="min-h-dvh bg-[color:var(--louis-cream,#fbf8f2)] flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
            </div>
        );
    }

    return (
        <main className="relative min-h-dvh bg-[#fbf8f2] text-[#1f2937]">
            <TopNav />
            <Hero />
            <Features />
            <WhyOpenSource />
            <FinalCta />
            <Footer />
        </main>
    );
}

// ---------------------------------------------------------------------------
// Top nav (Mike-style floating capsule)
// ---------------------------------------------------------------------------

function TopNav() {
    return (
        <nav className="fixed inset-x-0 top-5 z-50 flex justify-center px-4">
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
                    <Link
                        href="/"
                        aria-label="Louis home"
                        className="flex items-center gap-2 pl-2 pr-1"
                    >
                        <LouisWordmark size={22} />
                    </Link>
                    <div className="hidden md:flex items-center gap-1 text-sm text-gray-700">
                        <NavLink href="#features">Features</NavLink>
                        <NavLink href="#open-source">Why open source</NavLink>
                        <NavLink href="/academy">Academy</NavLink>
                        <NavLink href={REPO_URL} external>
                            GitHub
                        </NavLink>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/login"
                            className="px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-full"
                        >
                            Log in
                        </Link>
                        <Link
                            href="/signup"
                            className="px-3.5 py-1.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-full transition-colors"
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

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
    return (
        <section className="relative pt-32 md:pt-40 pb-16 md:pb-24 px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-center">
                <div className="md:col-span-6">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-700 mb-5">
                        <span className="h-px w-6 bg-amber-700" />
                        Open source legal AI
                    </span>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light leading-[1.05] tracking-tight">
                        The legal AI workbench, in an open codebase your firm
                        owns.
                    </h1>
                    <p className="mt-6 text-base md:text-lg text-gray-600 leading-relaxed max-w-xl font-serif">
                        Drafting, redlining, tabular review, citation, risk,
                        982 expert skills, MENA-first jurisdictions, and a
                        comfort-UI built for the way lawyers actually work.
                        Bring your own Claude · Gemini · OpenAI keys.
                        Self-host inside your perimeter.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
                        >
                            Sign up free
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <a
                            href={REPO_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium text-gray-900 border border-gray-300 hover:bg-white transition-colors"
                        >
                            <Github className="h-4 w-4" />
                            GitHub
                        </a>
                        <Link
                            href="/academy"
                            className="px-3 py-3 text-sm text-gray-600 hover:text-gray-900"
                        >
                            Read the docs →
                        </Link>
                    </div>
                    <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
                        <span>MIT licensed</span>
                        <span className="text-gray-300">·</span>
                        <span>BYO API keys (Claude · Gemini · OpenAI)</span>
                        <span className="text-gray-300">·</span>
                        <span>982 authored skills</span>
                        <span className="text-gray-300">·</span>
                        <span>30+ jurisdictions</span>
                    </div>
                </div>

                <div className="md:col-span-6">
                    <div className="relative rounded-2xl overflow-hidden border border-[#e7e2d6] shadow-[0_24px_60px_-20px_rgba(31,41,55,0.25)] bg-[#f3ead4]">
                        <Image
                            src="/hero-louis.svg"
                            alt="Louis — open-source legal AI workbench"
                            width={1600}
                            height={1000}
                            priority
                            className="block w-full h-auto"
                        />
                    </div>
                    <p className="mt-3 text-[11px] text-gray-500 text-center italic">
                        Louis crest — a serif L in a hairline circle of gold
                        leaf. Replace <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">public/hero-louis.svg</code> with your own generated image.
                    </p>
                </div>
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Features grid
// ---------------------------------------------------------------------------

function Features() {
    const features = [
        {
            icon: MessageSquare,
            title: "Assistant",
            body: "Streaming chat that reads your documents, cites verbatim, surfaces its reasoning, runs multi-step skills, and drafts contracts end-to-end. Plug in your own Claude / Gemini / OpenAI keys.",
        },
        {
            icon: Briefcase,
            title: "Matters & Projects",
            body: "Matter-scoped workspaces with conflict checks. Upload SPAs, leases, diligence packs into a project — the assistant keeps full context across every conversation and every doc.",
        },
        {
            icon: FileText,
            title: "Doc Workspace",
            body: "Per-document editor with versions, accept/reject suggestions, side-by-side compare, tone slider, in-line tracked-change redline export.",
        },
        {
            icon: Network,
            title: "Drafting Board",
            body: "Visual workspace for agentic legal workflows. Templates for M&A, Employment, Due Diligence, Contract Review. Lanes view groups by Human / Agent / Gate.",
        },
        {
            icon: Table2,
            title: "Tabular Review",
            body: "Spreadsheet-style extraction across hundreds of documents in parallel. Every cell is verifiably cited back to a page and a quote — no hallucinated answers.",
        },
        {
            icon: Library,
            title: "Workflows & Routines",
            body: "Save proven prompts as reusable workflows your juniors run in one click. Schedule recurring routines (daily digests, deadline reminders, watch lists).",
        },
        {
            icon: BookMarked,
            title: "Prompt Library",
            body: "152 expert-crafted prompts spanning drafting, review, research, compliance, strategy. Filter by use case + practice area. One click sends a template to the composer.",
        },
        {
            icon: Lock,
            title: "Vault",
            body: "Encrypted matter storage. AES-256 at rest, privilege-aware skill routing, audit log per access, per-client isolation, expiring shares.",
        },
        {
            icon: Rss,
            title: "Newsfeed",
            body: "Reddit-backed legal industry stream — drafting, big law, legal AI launches, regulator news. Add your own topics; Louis aggregates into one feed.",
        },
    ];

    return (
        <section
            id="features"
            className="relative py-20 md:py-28 px-6 bg-white border-y border-[#e7e2d6]"
        >
            <div className="max-w-6xl mx-auto">
                <div className="max-w-2xl mb-12 md:mb-16">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-700 mb-4">
                        <span className="h-px w-6 bg-amber-700" />
                        Features
                    </span>
                    <h2 className="text-3xl md:text-4xl font-serif font-light tracking-tight leading-tight">
                        Everything the incumbents ship, in a codebase your firm
                        can read line by line.
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {features.map(({ icon: Icon, title, body }) => (
                        <div
                            key={title}
                            className="rounded-2xl border border-[#e7e2d6] bg-[#fbf8f2] p-5 md:p-6 hover:shadow-sm transition-shadow"
                        >
                            <div className="w-9 h-9 rounded-lg border border-[#e7e2d6] bg-white flex items-center justify-center mb-3">
                                <Icon className="w-4 h-4 text-amber-700" />
                            </div>
                            <h3 className="font-serif text-lg mb-1.5">{title}</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {body}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Why open source
// ---------------------------------------------------------------------------

function WhyOpenSource() {
    const pillars = [
        {
            icon: KeyRound,
            title: "Zero license cost",
            body: "No vendor lock-in. No per-seat pricing that rises every year. You pay only the model API costs — at whatever rate your provider charges you.",
        },
        {
            icon: Server,
            title: "Self-hostable by design",
            body: "Deploy inside your own infrastructure. Documents never leave your perimeter. Compliance, residency, and privilege stay under your control.",
        },
        {
            icon: GitBranch,
            title: "Fork it. Extend it.",
            body: "Add practice-specific workflows, integrate your DMS, wire in your own citation engine. The whole codebase is yours to shape — MIT licensed.",
        },
        {
            icon: Eye,
            title: "Audit every line",
            body: "No black boxes around how prompts are built, how citations are parsed, or how data flows. The skill files are plain markdown — read every system prompt.",
        },
        {
            icon: ShieldCheck,
            title: "Privilege-aware",
            body: "Vault encryption at rest, per-client isolation, audit logging on every read. Conflict-of-interest checks before any cross-client access.",
        },
        {
            icon: BookOpenCheck,
            title: "Built on what works",
            body: "Forked from Mike. Rebuilt around the comfort-UI vision we developed at HAQQ. Production stack: Next.js + Express + Supabase + R2.",
        },
    ];

    return (
        <section
            id="open-source"
            className="relative py-20 md:py-28 px-6 bg-[#fbf8f2]"
        >
            <div className="max-w-6xl mx-auto">
                <div className="max-w-2xl mb-12 md:mb-16">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-700 mb-4">
                        <span className="h-px w-6 bg-amber-700" />
                        Why open source
                    </span>
                    <h2 className="text-3xl md:text-4xl font-serif font-light tracking-tight leading-tight">
                        Your firm&apos;s AI, on your own terms.
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {pillars.map(({ icon: Icon, title, body }) => (
                        <div key={title} className="flex gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white border border-[#e7e2d6] flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-amber-700" />
                            </div>
                            <div>
                                <h3 className="font-serif text-lg mb-1">
                                    {title}
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {body}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------

function FinalCta() {
    return (
        <section className="relative py-20 md:py-28 px-6 border-y border-[#e7e2d6] bg-white">
            <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-serif font-light tracking-tight leading-tight mb-4">
                    Start in the cloud. Or clone the repo.
                </h2>
                <p className="text-base md:text-lg text-gray-600 font-serif mb-8 max-w-xl mx-auto">
                    A working substitute for Harvey, Legora, and CoCounsel —
                    available as a hosted demo or to self-deploy from source
                    in ten minutes.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href="/signup"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
                    >
                        Sign up free
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                        href={REPO_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium text-gray-900 border border-gray-300 hover:bg-[#fbf8f2] transition-colors"
                    >
                        <Github className="h-4 w-4" />
                        Star on GitHub
                    </a>
                </div>
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer() {
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
                        <Link
                            href="/signup"
                            className="hover:text-gray-900 font-medium"
                        >
                            Sign up
                        </Link>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 pt-6 text-xs text-gray-500">
                    <span>
                        © {new Date().getFullYear()} Louis. MIT licensed.
                        Forked from{" "}
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
