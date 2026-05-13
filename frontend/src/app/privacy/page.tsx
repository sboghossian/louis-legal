/**
 * /privacy — public privacy policy for the hosted demo of Louis.
 *
 * Two-mode story: on the hosted demo at legal.dashable.dev we do collect
 * some data (auth + workbench content + opt-in telemetry); on a
 * self-hosted instance we collect nothing because we never see it.
 * Page makes that distinction explicit in every section so a self-hoster
 * reading this knows immediately that "we" is not them.
 *
 * Lives outside `(pages)/` so the route renders without an authenticated
 * session — same pattern as /terms and /signup.
 */

import Link from "next/link";
import {
    Shield,
    Database,
    Server,
    Share2,
    KeyRound,
    UserCheck,
    Scale,
    HardDrive,
    Mail,
    RefreshCcw,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata = {
    title: "Privacy — Louis",
    description:
        "What Louis collects on the hosted demo, where it sits, and who it goes to. Self-hosted instances collect nothing on our side.",
};

const LAST_UPDATED = "2026-05-13";
const REPO_URL = "https://github.com/sboghossian/louis-legal";

export default function PrivacyPage() {
    return (
        <MarketingShell>
            <article className="max-w-3xl mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-20 font-serif text-[#1f2937]">
                <header className="mb-12">
                    <div className="flex items-center gap-2 mb-3 text-amber-700">
                        <Shield className="w-5 h-5" />
                        <span className="text-xs uppercase tracking-[0.25em]">
                            Privacy
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-tight mb-3">
                        Privacy
                    </h1>
                    <p className="text-sm text-gray-600">
                        Last updated{" "}
                        <time dateTime={LAST_UPDATED}>{LAST_UPDATED}</time>. This
                        page covers the hosted demo at{" "}
                        <code className="text-[13px]">legal.dashable.dev</code>.
                        Self-hosted instances do not flow data through us at all.
                    </p>
                    <div
                        aria-hidden="true"
                        className="mt-8 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent"
                    />
                </header>

                <Section icon={Shield} title="TL;DR">
                    <p>
                        On the hosted demo we store your account, the documents
                        you upload, and the chats you have. We do not sell that
                        data and we do not share it with anyone except the AI
                        provider you have explicitly chosen for inference. If you
                        self-host Louis, none of this applies — your data never
                        touches our infrastructure.
                    </p>
                </Section>

                <Section icon={Database} title="What we collect (hosted demo only)">
                    <ul>
                        <li>
                            <strong>Authentication:</strong> email address and
                            display name, via Supabase Auth. OAuth-derived avatar
                            URL if you sign in with a provider that exposes one.
                        </li>
                        <li>
                            <strong>Workbench content:</strong> documents you
                            upload, chats you send, matters you create, and any
                            metadata you attach (parties, jurisdictions, tags).
                        </li>
                        <li>
                            <strong>Preferences:</strong> locale, theme, font, and
                            BYO API keys for the model providers you wire up. API
                            keys are encrypted at rest before they hit the
                            database.
                        </li>
                        <li>
                            <strong>Telemetry:</strong> PostHog events for
                            product-improvement analytics on the hosted demo only.
                            An opt-out toggle is on the roadmap. Self-host
                            installs ship with telemetry switched OFF by default
                            and there is no path that re-enables it without an
                            explicit env var.
                        </li>
                    </ul>
                </Section>

                <Section icon={Server} title="Where we store it">
                    <p>
                        Storage on the hosted demo runs on Supabase: a Postgres
                        database for structured records and an S3-compatible object
                        store for uploaded files, both provisioned in the{" "}
                        <code className="text-[13px]">eu-west-1</code> region.
                    </p>
                    <p>
                        Documents you mark as Vault items get an extra layer:
                        AES-256-GCM encryption at rest with a key derived from
                        your passphrase via PBKDF2. The derivation happens in your
                        browser and the resulting key never leaves your device.
                        We literally cannot decrypt vault-marked items — losing
                        the passphrase means losing the data. That is the
                        tradeoff and we cannot recover it for you.
                    </p>
                </Section>

                <Section icon={Share2} title="Who we share with">
                    <p>
                        Your AI provider — whichever you have selected: Anthropic,
                        Google, OpenAI, Cohere — receives the prompt and the
                        relevant document context to produce a completion. That is
                        the only third party in the path.
                    </p>
                    <p>
                        We do not train models on your data. We do not resell data.
                        We do not have data partnerships, ad networks, or
                        analytics sub-processors beyond PostHog (described above).
                    </p>
                </Section>

                <Section icon={KeyRound} title="AI provider relationship">
                    <p>
                        Louis is BYO-API-key: you wire your own credentials into
                        the workbench. The contract for those tokens — what the
                        provider does with the request, their data-retention
                        policy, their training opt-out posture — is between you
                        and the provider, not between you and us. We surface model
                        cards and links to each provider&apos;s policy in{" "}
                        <Link href="/transparency" className="text-amber-800 underline">
                            /transparency
                        </Link>
                        .
                    </p>
                </Section>

                <Section icon={UserCheck} title="Your rights">
                    <ul>
                        <li>
                            <strong>Export:</strong> request a JSON dump of every
                            record tied to your account. We use Supabase&apos;s
                            standard export and deliver it as a single archive.
                        </li>
                        <li>
                            <strong>Deletion:</strong> request account deletion and
                            the cascade fires through every matter, chat, and
                            document table. Vault items, being end-to-end
                            encrypted, are already opaque to us; deletion removes
                            the ciphertext.
                        </li>
                        <li>
                            <strong>Close anytime:</strong> close your account from{" "}
                            <Link href="/account" className="text-amber-800 underline">
                                /account
                            </Link>{" "}
                            without contacting us.
                        </li>
                    </ul>
                </Section>

                <Section icon={Scale} title="EU AI Act">
                    <p>
                        See{" "}
                        <Link href="/transparency" className="text-amber-800 underline">
                            /transparency
                        </Link>{" "}
                        for the full risk classification, intended-use disclosure,
                        known failure modes, and human-oversight design, published
                        in alignment with Regulation (EU) 2024/1689.
                    </p>
                </Section>

                <Section icon={HardDrive} title="Self-hosting">
                    <p>
                        If you deployed Louis yourself, none of this section
                        applies. You are the controller for the data your users
                        process, and you should publish your own privacy policy to
                        match. We provide a template at{" "}
                        <code className="text-[13px]">docs/SELF_HOST.md</code> in
                        the repository — fork it, fill in your details, host it at{" "}
                        <code className="text-[13px]">/privacy</code> on your
                        instance.
                    </p>
                </Section>

                <Section icon={Mail} title="Contact">
                    <p>
                        Open an issue at{" "}
                        <a
                            href={`${REPO_URL}/issues`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-800 underline"
                        >
                            the repository
                        </a>{" "}
                        for anything routine, or email the maintainer (address on
                        the GitHub profile) for data-protection enquiries. We aim
                        to acknowledge within a few business days; we are a small
                        project with a single maintainer, so please be patient.
                    </p>
                </Section>

                <Section icon={RefreshCcw} title="Changes">
                    <p>
                        We will update this page in place and bump the
                        &quot;last updated&quot; date when something changes.
                        Material changes — anything that meaningfully shifts what
                        we collect, where it sits, or who it goes to — get
                        announced in the repository README or in-product.
                    </p>
                </Section>

                <p className="mt-12 text-sm text-gray-600">
                    See also our{" "}
                    <Link href="/terms" className="text-amber-800 underline">
                        terms of service
                    </Link>{" "}
                    and{" "}
                    <Link href="/transparency" className="text-amber-800 underline">
                        transparency report
                    </Link>
                    .
                </p>
            </article>
        </MarketingShell>
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
            <h2 className="flex items-center gap-2 text-xl font-semibold mb-3">
                <Icon className="w-4 h-4 text-amber-700" />
                {title}
            </h2>
            <div className="space-y-3 leading-relaxed text-[15px] [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_li]:leading-relaxed">
                {children}
            </div>
        </section>
    );
}
