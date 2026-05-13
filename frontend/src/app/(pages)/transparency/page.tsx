/**
 * /transparency — EU AI Act-aligned transparency report.
 *
 * The EU AI Act (2024/1689) requires providers of general-purpose AI
 * systems and high-risk applications to publish:
 *  - intended purpose and limits
 *  - the system's risk classification + the reasoning
 *  - what data the system processes and where it sits
 *  - what humans the system is intended to support
 *  - how human oversight is provided
 *
 * Louis is GPAI-adjacent: we orchestrate third-party foundation models
 * with retrieval over user-supplied legal documents. We are NOT a
 * provider of a foundation model; we are a downstream deployer.
 *
 * This page is the public record. Updated whenever the system changes
 * in a material way. Self-hosted operators MUST publish their own
 * version that reflects the foundation models they wire in.
 */

import Link from "next/link";
import { ShieldCheck, AlertTriangle, Eye, Cpu, FileSearch, Users } from "lucide-react";

export const metadata = {
    title: "Transparency report — Louis",
    description:
        "EU AI Act-aligned transparency disclosure for Louis: intended purpose, risk classification, data flows, human oversight.",
};

const LAST_UPDATED = "2026-05-13";

export default function TransparencyPage() {
    return (
        <article className="max-w-3xl mx-auto px-6 md:px-10 py-12 font-serif text-gray-800">
            <header className="mb-10 not-prose">
                <div className="flex items-center gap-2 mb-3 text-amber-700">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-xs uppercase tracking-[0.25em]">
                        EU AI Act transparency
                    </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-tight mb-3">
                    How Louis is built, what it does, and what it doesn&apos;t.
                </h1>
                <p className="text-sm text-gray-500">
                    Last updated <time dateTime={LAST_UPDATED}>{LAST_UPDATED}</time>.
                    Published in alignment with Regulation (EU) 2024/1689
                    (AI Act). Self-hosted operators should publish their own
                    version reflecting their model and data choices.
                </p>
            </header>

            <Section icon={FileSearch} title="1. Intended purpose">
                <p>
                    Louis is a productivity and research assistant for legal
                    professionals. It helps lawyers draft, review, summarize,
                    and search legal documents and answers questions about
                    user-supplied materials using third-party foundation models.
                </p>
                <p>
                    Louis is <strong>not</strong> a substitute for qualified
                    legal advice. Outputs are intended for review by a licensed
                    professional before any reliance, filing, or external
                    communication.
                </p>
            </Section>

            <Section icon={AlertTriangle} title="2. Risk classification">
                <p>
                    Under the AI Act&apos;s tiered framework, Louis as deployed
                    by us is <strong>limited-risk</strong>: a generative AI
                    system used to assist human professionals. We do not
                    perform any prohibited practices (Art. 5) and we do not
                    deploy Louis for any high-risk use case enumerated in
                    Annex III (employment scoring, education admissions,
                    biometric identification, etc.).
                </p>
                <p>
                    The foundation models Louis calls (Anthropic Claude,
                    Google Gemini, OpenAI) are general-purpose AI models in
                    the meaning of Art. 51. Their providers carry the GPAI
                    obligations; we surface their model cards on request.
                </p>
                <p>
                    Operators self-hosting Louis who configure it for a
                    high-risk use case (e.g. judicial decision-making
                    support) inherit the high-risk obligations under Title III.
                </p>
            </Section>

            <Section icon={Cpu} title="3. Models we route to">
                <ul>
                    <li>
                        <strong>Anthropic Claude</strong> (Opus 4.7, Sonnet 4.6, Haiku 4.5)
                        — primary drafting / review / reasoning.
                    </li>
                    <li>
                        <strong>Google Gemini</strong> (2.5 Pro, 2.0 Flash) — long-context
                        document review.
                    </li>
                    <li>
                        <strong>OpenAI</strong> (o3, GPT-4o) — fallback + structured
                        extraction.
                    </li>
                </ul>
                <p>
                    User-supplied API keys take precedence over server-side
                    keys. In BYO-key mode, Louis acts strictly as the agent of
                    the user with their model contract; we do not log or
                    retain prompts or completions.
                </p>
            </Section>

            <Section icon={Eye} title="4. Data we process">
                <p>
                    Louis processes the documents you upload, the chat
                    messages you compose, and your account metadata
                    (organisation, jurisdictions, preferences) for the purpose
                    of producing the requested output. We do not train any
                    foundation model on customer data. We do not sell or
                    share customer data with third parties beyond the model
                    provider you have chosen.
                </p>
                <p>
                    In the hosted demo at <code>legal.dashable.dev</code>:
                    storage is Supabase (Postgres + S3-compatible R2) hosted
                    in the EU. Vault-marked documents are encrypted at rest
                    with AES-256-GCM. Self-hosted Louis stores nothing on our
                    infrastructure.
                </p>
            </Section>

            <Section icon={Users} title="5. Human oversight">
                <p>
                    Louis is designed for a human-in-the-loop workflow.
                    Outputs surface reasoning by default and citations link
                    back to the source page so a reviewer can verify before
                    using any output. Agentic workflows (Drafting Board) gate
                    at user-configured checkpoints.
                </p>
                <p>
                    Every export is stamped as AI-assisted and warning text
                    appears on rendered PDFs. A &quot;privileged&quot; toggle
                    blocks export entirely for matter materials covered by
                    legal professional privilege.
                </p>
            </Section>

            <Section icon={ShieldCheck} title="6. Known limitations & failure modes">
                <ul>
                    <li>
                        <strong>Hallucination:</strong> the underlying models can
                        invent case law, statute references, or quotations.
                        Every output must be verified.
                    </li>
                    <li>
                        <strong>Recency:</strong> model knowledge has a cutoff;
                        Louis cannot guarantee currency of statutes or case
                        law unless explicitly retrieved from a live source.
                    </li>
                    <li>
                        <strong>Jurisdictional gaps:</strong> we cover 30+
                        jurisdictions but depth varies. Skill router shows
                        which jurisdiction skills fired per turn.
                    </li>
                    <li>
                        <strong>Adversarial inputs:</strong> Louis is not
                        hardened against prompt injection in untrusted
                        documents. Treat third-party documents as untrusted
                        text.
                    </li>
                </ul>
            </Section>

            <Section icon={Users} title="7. Complaints & contact">
                <p>
                    Report a concern, a hallucination, or an inappropriate
                    output via{" "}
                    <a
                        className="text-amber-800 underline"
                        href="https://github.com/sboghossian/louis-legal/issues"
                        target="_blank"
                        rel="noreferrer"
                    >
                        GitHub Issues
                    </a>
                    . For data-protection enquiries on the hosted demo,
                    contact the maintainer at the email listed on the
                    repository.
                </p>
                <p className="text-sm text-gray-500 mt-4">
                    Self-hosting an instance of Louis? You become the
                    controller for the data your users process. Replace this
                    page with your organisation&apos;s disclosure. See the{" "}
                    <Link href="/academy" className="text-amber-800 underline">
                        cookbook
                    </Link>
                    {" "}for a template.
                </p>
            </Section>
        </article>
    );
}

function Section({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mb-10">
            <h2 className="flex items-center gap-2 text-xl font-semibold mb-3 not-prose">
                <Icon className="w-4 h-4 text-amber-700" />
                {title}
            </h2>
            <div className="space-y-3 leading-relaxed text-[15px]">
                {children}
            </div>
        </section>
    );
}
