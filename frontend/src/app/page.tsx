/**
 * Marketing landing page for legal.dashable.dev (the root URL).
 *
 * Server-rendered for SEO + faster FCP. A small client island
 * (LandingAuthRedirect) routes already-signed-in visitors to /assistant
 * once hydration completes — the hero, headlines, and feature copy still
 * ship in the initial HTML.
 *
 * The hero illustration is rendered inline via <HeroMock />: an animated
 * SVG/HTML composite of the Louis workbench (no external asset, no jpg
 * to refresh). Each feature card has its own inline mock so visitors can
 * see what each surface looks like before signing up — Mike-style.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
    Github,
    ArrowRight,
    MessageSquare,
    FileText,
    Table2,
    Network,
    Library,
    BookMarked,
    Briefcase,
    Rss,
    Lock,
    ShieldCheck,
    KeyRound,
    Server,
    GitBranch,
    Eye,
    BookOpenCheck,
    type LucideIcon,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LandingAuthRedirect } from "./_LandingAuthRedirect";
import {
    HeroMock,
    AssistantMock,
    MattersMock,
    DocWorkspaceMock,
    DraftingBoardMock,
    TabularReviewMock,
    WorkflowsMock,
    PromptLibraryMock,
    VaultMock,
    NewsfeedMock,
} from "@/components/marketing/feature-mocks";

const REPO_URL = "https://github.com/sboghossian/louis-legal";

const LANDING_TITLE =
    "Louis — the developer platform for legal infrastructure";
const LANDING_DESCRIPTION =
    "Open-source, sovereign, free. Build legal AI inside your own perimeter — your API key, your data, your stack. 982 skills, 30+ jurisdictions, MIT licensed. The substrate behind your firm's next ten years of legal software.";

export const metadata: Metadata = {
    metadataBase: new URL("https://legal.dashable.dev"),
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    alternates: {
        canonical: "/",
    },
    openGraph: {
        type: "website",
        url: "/",
        siteName: "Louis",
        title: LANDING_TITLE,
        description: LANDING_DESCRIPTION,
        images: [
            {
                url: "/og-image.svg",
                width: 1200,
                height: 630,
                alt: "Louis — open-source legal AI",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: LANDING_TITLE,
        description: LANDING_DESCRIPTION,
        images: ["/og-image.svg"],
    },
};

export default function LandingPage() {
    return (
        <>
            <LandingAuthRedirect />
            <MarketingShell>
                <Hero />
                <SocialProofStrip />
                <Features />
                <WhyOpenSource />
                <FinalCta />
            </MarketingShell>
        </>
    );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
    return (
        <section className="relative pt-32 md:pt-40 pb-12 md:pb-20 px-6 overflow-hidden">
            {/* Decorative gold-leaf orbs */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-amber-200/30 blur-3xl louis-orb"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute top-20 right-0 w-[28rem] h-[28rem] rounded-full bg-[#c9a961]/15 blur-3xl louis-orb"
                style={{ animationDelay: "5s" }}
            />

            <div className="relative max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-center">
                <div className="md:col-span-6">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-700 mb-5">
                        <span className="h-px w-6 bg-amber-700" />
                        Sovereign · open source · free forever
                    </span>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light leading-[1.05] tracking-tight">
                        The developer platform for legal infrastructure.
                    </h1>
                    <p className="mt-6 text-base md:text-lg text-gray-600 leading-relaxed max-w-xl font-serif">
                        Louis is the open substrate firms and in-house teams build legal AI on top of. Your API key. Your data. Your stack. 982 skills, 30+ jurisdictions, MIT licensed — and the only cost is the tokens you spend with your model provider.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors shadow-sm"
                        >
                            Start free
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <a
                            href={REPO_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium text-gray-900 border border-gray-300 hover:bg-white transition-colors"
                        >
                            <Github className="h-4 w-4" />
                            Clone the repo
                        </a>
                        <Link
                            href="/academy"
                            className="px-3 py-3 text-sm text-gray-600 hover:text-gray-900"
                        >
                            Read the cookbook →
                        </Link>
                    </div>
                    <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Free forever
                        </span>
                        <span className="text-gray-300">·</span>
                        <span>BYO API keys</span>
                        <span className="text-gray-300">·</span>
                        <span>MIT licensed</span>
                        <span className="text-gray-300">·</span>
                        <span>Self-hostable</span>
                    </div>
                </div>

                <div className="md:col-span-6">
                    <div className="louis-float">
                        <HeroMock />
                    </div>
                    <p className="mt-3 text-[11px] text-gray-500 text-center italic">
                        Real surfaces, no marketing screenshot — what you sign in to.
                    </p>
                </div>
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Social proof strip — quiet brand line (open source, fork count, etc.)
// ---------------------------------------------------------------------------

function SocialProofStrip() {
    const items = [
        "Fork-friendly",
        "Self-hostable",
        "Streaming reasoning",
        "Per-message feedback",
        "Verifiable citations",
        "Privilege-aware vault",
    ];
    return (
        <section className="px-6 py-8 border-y border-[#e7e2d6] bg-white/60 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] uppercase tracking-[0.25em] text-gray-500">
                {items.map((t, i) => (
                    <span key={t} className="inline-flex items-center gap-3">
                        {i > 0 && <span className="text-gray-300">·</span>}
                        {t}
                    </span>
                ))}
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Features grid — each card has its own animated mock
// ---------------------------------------------------------------------------

interface FeatureSpec {
    icon: LucideIcon;
    title: string;
    body: string;
    Mock: React.ComponentType<{ className?: string }>;
    href?: string;
}

const FEATURES: FeatureSpec[] = [
    {
        icon: MessageSquare,
        title: "Streaming assistant with reasoning",
        body: "Watch the model think before it writes. Reasoning shows by default for Claude, Gemini, and OpenAI. Per-message thumbs up/down feeds the team review.",
        Mock: AssistantMock,
        href: "/assistant",
    },
    {
        icon: Briefcase,
        title: "Matters & projects",
        body: "Matter-scoped workspaces with conflict checks. Upload SPAs, leases, diligence packs — the assistant keeps full context across every doc.",
        Mock: MattersMock,
        href: "/projects",
    },
    {
        icon: FileText,
        title: "Doc workspace + redlines",
        body: "Per-document editor with versions, accept/reject suggestions, side-by-side compare, tone slider, in-line tracked-change redline export.",
        Mock: DocWorkspaceMock,
        href: "/doc-workspace",
    },
    {
        icon: Network,
        title: "Drafting Board",
        body: "Visual workspace for agentic legal workflows. Templates for M&A, Employment, Due Diligence, Contract Review. Human/agent/gate lanes.",
        Mock: DraftingBoardMock,
        href: "/drafting-board",
    },
    {
        icon: Table2,
        title: "Tabular review",
        body: "Spreadsheet-style extraction across hundreds of documents in parallel. Every cell verifiably cited back to a page and a quote.",
        Mock: TabularReviewMock,
        href: "/tabular-reviews",
    },
    {
        icon: Library,
        title: "Workflows & routines",
        body: "Save proven prompts as reusable workflows. Schedule recurring routines — daily digests, deadline reminders, watch lists, regulator sweeps.",
        Mock: WorkflowsMock,
        href: "/routines",
    },
    {
        icon: BookMarked,
        title: "Prompt library",
        body: "152 expert-crafted prompts spanning drafting, review, research, compliance, strategy. Filter by use case + practice area, one-click to composer.",
        Mock: PromptLibraryMock,
        href: "/prompt-library",
    },
    {
        icon: Lock,
        title: "Vault",
        body: "Encrypted matter storage. AES-256 at rest, privilege-aware skill routing, audit log per access, per-client isolation, expiring shares.",
        Mock: VaultMock,
        href: "/vault",
    },
    {
        icon: Rss,
        title: "Newsfeed",
        body: "Reddit-backed legal industry stream — drafting, big law, legal AI launches, regulator news. Add your own topics; Louis aggregates one feed.",
        Mock: NewsfeedMock,
        href: "/feed",
    },
];

function Features() {
    return (
        <section id="features" className="relative py-20 md:py-28 px-6 bg-white">
            <div className="max-w-6xl mx-auto">
                <div className="max-w-2xl mb-12 md:mb-16">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-700 mb-4">
                        <span className="h-px w-6 bg-amber-700" />
                        The platform
                    </span>
                    <h2 className="text-3xl md:text-4xl font-serif font-light tracking-tight leading-tight">
                        Every legal-AI primitive your firm needs — visible, hackable, and yours.
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                    {FEATURES.map(({ icon: Icon, title, body, Mock, href }) => (
                        <article
                            key={title}
                            className="group rounded-2xl border border-[#e7e2d6] bg-[#fbf8f2] p-4 md:p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
                        >
                            <Mock className="mb-4 group-hover:shadow-sm transition-shadow" />
                            <div className="flex items-start gap-2 mb-1.5">
                                <div className="w-7 h-7 rounded-lg border border-[#e7e2d6] bg-white flex items-center justify-center shrink-0">
                                    <Icon className="w-3.5 h-3.5 text-amber-700" />
                                </div>
                                <h3 className="font-serif text-lg leading-tight pt-0.5">
                                    {title}
                                </h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {body}
                            </p>
                            {href && (
                                <Link
                                    href={href}
                                    className="mt-3 inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900 font-medium"
                                >
                                    See it live
                                    <ArrowRight className="w-3 h-3" />
                                </Link>
                            )}
                        </article>
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
            body: "No vendor lock-in. No per-seat pricing that climbs every year. You pay only the model API costs — at whatever rate your provider charges you.",
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
            body: "No black boxes around how prompts are built, how citations are parsed, or how data flows. Skill files are plain markdown — read every system prompt.",
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
        <section id="open-source" className="relative py-20 md:py-28 px-6 bg-[#fbf8f2] border-y border-[#e7e2d6]">
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
                                <h3 className="font-serif text-lg mb-1">{title}</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
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
        <section className="relative py-20 md:py-28 px-6 bg-white">
            <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-serif font-light tracking-tight leading-tight mb-4">
                    Start in the cloud. Or clone the repo.
                </h2>
                <p className="text-base md:text-lg text-gray-600 font-serif mb-8 max-w-xl mx-auto">
                    A working substitute for Harvey, Legora, and CoCounsel — available as a hosted demo or to self-deploy from source in ten minutes.
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
