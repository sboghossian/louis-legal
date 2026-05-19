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
  Lock,
  ShieldCheck,
  KeyRound,
  Server,
  GitBranch,
  Eye,
  BookOpenCheck,
  Users,
  Cpu,
  Scale,
  ClipboardCheck,
  GitCompareArrows,
  Star,
  type LucideIcon,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SoftwareApplicationData } from "@/components/structured-data";
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
  PersonasMock,
  ModelPickerMock,
  CaseLawMock,
  ApprovalAuditMock,
  DocComparisonMock,
} from "@/components/marketing/feature-mocks";

const REPO_URL = "https://github.com/sboghossian/louis-legal";

const LANDING_TITLE = "Louis — the developer platform for legal infrastructure";
const LANDING_DESCRIPTION =
  "Open-source, sovereign, free. Build legal AI inside your own perimeter — your API key, your data, your stack. 983 skills, 30+ jurisdictions, MIT licensed. The substrate behind your firm's next ten years of legal software.";

export const metadata: Metadata = {
  // `absolute` so the root layout's "%s · Louis" template doesn't append
  // " · Louis" onto a title that already names the product.
  title: { absolute: LANDING_TITLE },
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
  },
  twitter: {
    card: "summary_large_image",
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
  },
};

export default function LandingPage() {
  return (
    <>
      <SoftwareApplicationData />
      <LandingAuthRedirect />
      <MarketingShell>
        <Hero />
        <SocialProofStrip />
        <Features />
        <TwoPaths />
        <WhyOpenSource />
        <FounderNote />
        <Faq />
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
            Louis is the open substrate firms and in-house teams build legal AI
            on top of. Your API key. Your data. Your stack. 983 skills, 30+
            jurisdictions, MIT licensed — and the only cost is the tokens you
            spend with your model provider.
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
          <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e7e2d6] bg-white/70 px-2.5 py-1 hover:border-amber-300 transition-colors"
            >
              <Star className="w-3 h-3 text-amber-600" aria-hidden="true" />
              <span className="text-gray-700">MIT</span>
              <span className="text-gray-300" aria-hidden="true">
                ·
              </span>
              <span className="text-gray-700">Star on GitHub</span>
              <span className="text-gray-300" aria-hidden="true">
                ·
              </span>
              <span className="text-emerald-600 inline-flex items-center gap-1">
                <span
                  className="w-1 h-1 rounded-full bg-emerald-500 louis-pulse"
                  aria-hidden="true"
                />
                active
              </span>
            </a>
            <span className="text-gray-300">·</span>
            <span>BYO API keys</span>
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
    icon: Users,
    title: "12 practice-area personas",
    body: "Built-in M&A, Litigation, Employment, IP, Capital Markets, Arbitration, Tax, FinTech, Privacy, Real Estate, Compliance, Investigations — each with its own system prompt and skill subset. Roll your own without leaving the app.",
    Mock: PersonasMock,
    href: "/customize",
  },
  {
    icon: Cpu,
    title: "Bring your own model keys",
    body: "Claude, GPT-5, Gemini, Qwen, or your own llama.cpp endpoint. Plug in provider keys to bypass the demo budget and bill your own account. Per-team budgets, per-route routing.",
    Mock: ModelPickerMock,
    href: "/settings",
  },
  {
    icon: Scale,
    title: "Verifiable case law via CourtListener",
    body: '"Find Ninth Circuit cases on qualified immunity from 2023." Real US opinions returned with direct links — no fabricated authorities. Federal and state coverage via the Free Law Project API.',
    Mock: CaseLawMock,
  },
  {
    icon: ClipboardCheck,
    title: "Audit log + approval hooks",
    body: "Audit-log schema and approval-hook primitives ship in the platform. Wire any agent action through review before dispatch; emit structured activity records on every read and write. Opt-in, not on by default — your firm decides what gets gated.",
    Mock: ApprovalAuditMock,
  },
  {
    icon: GitCompareArrows,
    title: "Document comparison",
    body: "Diff two versions of a contract, highlight material changes, and summarise what moved between drafts. The redline workflow lawyers actually do — automated, reviewable, exportable.",
    Mock: DocComparisonMock,
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
            Every legal-AI primitive your firm needs — visible, hackable, and
            yours.
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
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
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
      body: "Forked from Mike. Rebuilt around a comfort-UI vision for legal practice — the surfaces a lawyer actually wants. Production stack: Next.js + Express + Supabase + R2.",
    },
  ];

  return (
    <section
      id="open-source"
      className="relative py-20 md:py-28 px-6 bg-[#fbf8f2] border-y border-[#e7e2d6]"
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
// Two paths — hosted demo vs self-host (both free)
// ---------------------------------------------------------------------------

function TwoPaths() {
  return (
    <section
      id="pricing"
      className="relative py-20 md:py-28 px-6 bg-white border-y border-[#e7e2d6]"
    >
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-12 md:mb-16">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-700 mb-4">
            <span className="h-px w-6 bg-amber-700" />
            Two paths · same code · both free
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-light tracking-tight leading-tight">
            Use the hosted demo, or clone the repo.
          </h2>
          <p className="mt-3 text-base text-gray-600 font-serif">
            One product, free either way. Same MIT-licensed code, same schema,
            same workflows. Migrate between the two whenever you want.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-[#e7e2d6] bg-[#fbf8f2] p-6 md:p-8">
            <div className="flex items-baseline gap-3 mb-4">
              <h3 className="font-serif text-xl">Hosted</h3>
              <span className="text-xs uppercase tracking-wider text-amber-700">
                free to start
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Same code, run by us on legal.dashable.dev. A demo budget of model
              tokens is included so you can try the full surface without your
              own keys.
            </p>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li className="flex gap-2">
                <span className="text-emerald-600 mt-1">✓</span>
                <span>Demo token budget included — no card required</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 mt-1">✓</span>
                <span>Up and running in minutes, no installation</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 mt-1">✓</span>
                <span>Managed OAuth, updates, infrastructure</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 mt-1">✓</span>
                <span>Full data export to self-hosted at any time</span>
              </li>
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
            >
              Try hosted — free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-[#e7e2d6] bg-white p-6 md:p-8">
            <div className="flex items-baseline gap-3 mb-4">
              <h3 className="font-serif text-xl">Self-hosted</h3>
              <span className="text-xs uppercase tracking-wider text-amber-700">
                free forever
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              MIT-licensed code. Run on your own infrastructure with your own
              model keys. Documents never traverse our network.
            </p>
            <ul className="space-y-2 text-sm text-gray-700 mb-6">
              <li className="flex gap-2">
                <span className="text-emerald-600 mt-1">✓</span>
                <span>Fork the repo, follow the README</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 mt-1">✓</span>
                <span>Bring your own LLM provider keys</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 mt-1">✓</span>
                <span>Client data never traverses our infrastructure</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600 mt-1">✓</span>
                <span>One-command migration from hosted</span>
              </li>
            </ul>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium text-gray-900 border border-gray-300 hover:bg-[#fbf8f2] transition-colors"
            >
              <Github className="h-4 w-4" />
              Fork on GitHub
            </a>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-gray-500 italic">
          No enterprise tier. No paid plan. One product either way — same MIT
          license.
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Founder note
// ---------------------------------------------------------------------------

function FounderNote() {
  return (
    <section className="relative py-20 md:py-28 px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-700 mb-4">
          <span className="h-px w-6 bg-amber-700" />
          Why we built this
        </span>
        <h2 className="text-2xl md:text-3xl font-serif font-light tracking-tight leading-tight mb-6">
          A note from the maintainer
        </h2>
        <div className="space-y-4 text-base text-gray-700 font-serif leading-relaxed">
          <p>
            Louis is a solo experiment on the edges of AI — what happens when
            you take the baseline of legal AI (assistant chat, document
            analysis, drafting, structured review, workflows) and ship it as
            open code instead of a closed SaaS. No company behind it. No
            roadmap pressure. Just me, the repo, and whoever wants to fork
            it.
          </p>
          <p>
            I started from{" "}
            <a
              href="https://github.com/willchen96/mike"
              target="_blank"
              rel="noreferrer"
              className="text-amber-800 underline decoration-amber-300 underline-offset-2"
            >
              Mike
            </a>{" "}
            and rebuilt it around a comfort-UI vision for how a lawyer
            actually wants to use software — calm surfaces, real citations,
            tracked-change redlines that open in Word, a vault that knows
            about privilege. Open-source because the baseline of legal AI
            should not be locked inside a closed product with per-seat
            pricing. The depth — the firm-specific playbooks, the
            obligations, the house style — is where firms differentiate.
            The baseline should be common infrastructure.
          </p>
          <p>
            If Louis is useful to you, fork it, change it, run it on your own
            infrastructure. PRs welcome. Issues welcome. Everything is MIT.
          </p>
        </div>
        <div className="mt-8 flex items-center gap-3 text-sm">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center text-amber-900 font-serif">
            S
          </div>
          <div>
            <div className="font-medium text-gray-900">
              Stephane &middot;{" "}
              <a
                href="https://github.com/sboghossian"
                target="_blank"
                rel="noreferrer"
                className="text-amber-800 hover:text-amber-900"
              >
                @sboghossian
              </a>
            </div>
            <div className="text-gray-500 text-xs">Maintainer · MIT · solo project</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ — straight answers to the questions every buyer asks
// ---------------------------------------------------------------------------

function Faq() {
  const items = [
    {
      q: "How is Louis different from Harvey, Legora, or CoCounsel?",
      a: "Harvey, Legora, and CoCounsel are polished closed SaaS products. Louis ships the same baseline surface — assistant chat, document analysis, drafting, structured review, workflows — as open-source code you can inspect, modify, and run inside your own infrastructure. The structural difference is ownership. When the assistant doesn't quite fit how your firm works, you can change it. When you want a drafting playbook or obligations tracker specific to your practice, you build it into the system, not around it.",
    },
    {
      q: "Why give it away? And what if you disappear?",
      a: "Louis is the open baseline. Above the baseline — the playbooks, the firm-specific workflows, the deep integrations into your DMS and billing and matter system — is where differentiation happens. We open-sourced the baseline because we don't believe legal teams should pay rent on commoditized infrastructure. Everything is MIT-licensed. If we shut down tomorrow, you still have the code, the prompts, the workflows, the schema, and the right to deploy it anywhere.",
    },
    {
      q: "Is our client data really safe?",
      a: "For self-hosted deployments, the app, the database, the prompts, the workflows, and the documents run where you put them. There is no shared Louis service that sees your traffic. Client matters travel only to whichever LLM provider you configure under your own keys and contract, or to a local model endpoint inside your perimeter. For the hosted demo, please do not upload sensitive, confidential, or privileged client documents.",
    },
    {
      q: "What about hallucinated citations?",
      a: "Same constraint as every LLM-based legal tool: models can confabulate. Louis routes citation-sensitive work through retrieval against your ingested documents and verifiable sources like CourtListener — so the assistant cites real passages or admits it doesn't have one, rather than inventing an authority. A human still verifies; the platform's audit-log primitives are there to record that they did.",
    },
    {
      q: "Can we deploy this without an internal tech team?",
      a: "Yes — that's what hosted is for. Same code, run by us, free to start with a demo token budget. Self-hosting the OSS requires Node, Postgres, an OpenAI-compatible model endpoint, and someone to own uptime, so most firms without a developer in-house pick hosted. You keep full data export and the right to migrate to self-hosted whenever you want — no lock-in to begin with.",
    },
  ];
  return (
    <section
      id="faq"
      className="relative py-20 md:py-28 px-6 bg-[#fbf8f2] border-y border-[#e7e2d6]"
    >
      <div className="max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-700 mb-4">
          <span className="h-px w-6 bg-amber-700" />
          Questions we get asked
        </span>
        <h2 className="text-3xl md:text-4xl font-serif font-light tracking-tight leading-tight mb-10">
          Straight answers.
        </h2>
        <div className="divide-y divide-[#e7e2d6]">
          {items.map(({ q, a }) => (
            <details key={q} className="group py-5">
              <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
                <h3 className="font-serif text-lg md:text-xl leading-tight text-gray-900">
                  {q}
                </h3>
                <span
                  aria-hidden="true"
                  className="shrink-0 mt-1 text-amber-700 group-open:rotate-45 transition-transform text-2xl leading-none font-light"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm md:text-base text-gray-600 leading-relaxed font-serif">
                {a}
              </p>
            </details>
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
          A working substitute for Harvey, Legora, and CoCounsel — available as
          a hosted demo or to self-deploy from source in ten minutes.
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
