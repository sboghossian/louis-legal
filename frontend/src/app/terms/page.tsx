/**
 * /terms — public terms of service for the hosted demo of Louis.
 *
 * Louis is MIT-licensed and free-forever; the only "transaction" with us
 * is the use of the hosted demo at legal.dashable.dev. The user's spend
 * is with their own AI provider via a BYO API key. These terms reflect
 * that posture honestly: no fees, no SLA, no escrow, no liability beyond
 * what the MIT license already concedes.
 *
 * Lives outside `(pages)/` so it renders without an authenticated session
 * — same routing pattern as /login and /signup.
 */

import Link from "next/link";
import {
    Scale,
    HandCoins,
    Package,
    ShieldOff,
    AlertTriangle,
    DoorOpen,
    Gavel,
    MapPin,
    RefreshCcw,
} from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata = {
    title: "Terms of service — Louis",
    description:
        "The terms covering use of the hosted demo of Louis. MIT-licensed, free-forever, BYO-API-key — read in five minutes.",
};

const LAST_UPDATED = "2026-05-13";
const REPO_URL = "https://github.com/sboghossian/louis-legal";

export default function TermsPage() {
    return (
        <MarketingShell>
            <article className="max-w-3xl mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-20 font-serif text-[#1f2937]">
                <header className="mb-12">
                    <div className="flex items-center gap-2 mb-3 text-amber-700">
                        <Scale className="w-5 h-5" />
                        <span className="text-xs uppercase tracking-[0.25em]">
                            Terms of service
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-tight mb-3">
                        Terms of service
                    </h1>
                    <p className="text-sm text-gray-600">
                        Last updated{" "}
                        <time dateTime={LAST_UPDATED}>{LAST_UPDATED}</time>. Plain
                        prose, no surprises. If you self-host Louis, none of this
                        applies — you set your own terms with your own users.
                    </p>
                    <div
                        aria-hidden="true"
                        className="mt-8 h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent"
                    />
                </header>

                <Section icon={Package} title="What Louis is">
                    <p>
                        Louis is a free, open-source legal-AI workbench. The source
                        code is published under the MIT license at{" "}
                        <a
                            href={REPO_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-800 underline"
                        >
                            github.com/sboghossian/louis-legal
                        </a>
                        . You can use the hosted demo at{" "}
                        <code className="text-[13px]">legal.dashable.dev</code>, or
                        you can clone the repository and self-host the entire stack
                        on infrastructure you control. Both options are supported
                        and neither costs money.
                    </p>
                </Section>

                <Section icon={HandCoins} title="The deal">
                    <p>
                        Louis itself is provided as-is with no fees. We do not
                        charge for accounts, seats, features, capacity, support, or
                        any tier of the product. There is no payment relationship
                        between you and us.
                    </p>
                    <p>
                        The only cost you incur is the inference cost from your
                        chosen AI provider — Anthropic, Google, OpenAI, Cohere, or
                        any other supported back end — billed at their rates,
                        through your own account, on an API key you bring. We
                        never proxy the model bill back to you.
                    </p>
                </Section>

                <Section icon={Package} title="What you get">
                    <ul>
                        <li>
                            Access to the workbench at{" "}
                            <code className="text-[13px]">legal.dashable.dev</code>{" "}
                            on a best-effort basis. Uptime is not guaranteed and we
                            make no SLA promises.
                        </li>
                        <li>
                            The Louis cookbook and the public API documented at{" "}
                            <Link href="/academy" className="text-amber-800 underline">
                                /academy
                            </Link>
                            .
                        </li>
                        <li>The full source code, free to fork, modify, and redistribute under MIT.</li>
                        <li>
                            The hosted demo is intended for evaluation and personal
                            workflows. Do not upload privileged client documents to
                            the hosted demo unless your firm has approved that
                            instance. If you need privilege-grade isolation,
                            self-host.
                        </li>
                    </ul>
                </Section>

                <Section icon={ShieldOff} title="What we don't do">
                    <ul>
                        <li>We do not provide legal advice. Louis is a tool used by lawyers, not a lawyer.</li>
                        <li>
                            We do not guarantee the accuracy, completeness, or
                            currency of any output. Models hallucinate; every
                            output must be verified by a qualified professional
                            before reliance.
                        </li>
                        <li>
                            We do not act as an escrow or trust service over your
                            data. The hosted demo stores what you upload at our
                            best-effort hygiene; for privileged data, self-host.
                        </li>
                        <li>
                            We do not audit your usage, your prompts, or your
                            outputs except as strictly required to keep the hosted
                            demo running and to enforce these terms.
                        </li>
                    </ul>
                </Section>

                <Section icon={AlertTriangle} title="Acceptable use">
                    <p>
                        Standard list. While using the hosted demo, you agree not to:
                    </p>
                    <ul>
                        <li>Use Louis for illegal activity or to facilitate it.</li>
                        <li>
                            Automate abuse of model providers — rate-limit evasion,
                            credential sharing, token theft, or any conduct that
                            would violate the underlying model provider&apos;s terms.
                        </li>
                        <li>Resell, sublicense, or rebrand the hosted demo as your own commercial service.</li>
                        <li>Impersonate another person, firm, or entity.</li>
                        <li>
                            Probe, scan, or attempt to compromise the security of
                            the hosted infrastructure. Coordinated disclosure is
                            welcome via a GitHub issue.
                        </li>
                    </ul>
                </Section>

                <Section icon={DoorOpen} title="Termination">
                    <p>
                        You can stop using Louis at any time. Close your account
                        from{" "}
                        <Link href="/account" className="text-amber-800 underline">
                            /account
                        </Link>{" "}
                        and all matter, chat, and document records cascade-delete.
                    </p>
                    <p>
                        We may suspend or terminate a hosted-demo account that
                        violates the acceptable-use section above. Because Louis is
                        open source, suspension on our infrastructure never blocks
                        you from forking the repository and running your own
                        instance.
                    </p>
                </Section>

                <Section icon={Gavel} title="Limitation of liability">
                    <p>
                        Consistent with the MIT license, our liability is capped at
                        zero. The software is provided &quot;AS IS&quot;, without
                        warranty of any kind, express or implied. In no event shall
                        the authors or copyright holders be liable for any claim,
                        damages, or other liability arising from the software or
                        its use.
                    </p>
                </Section>

                <Section icon={MapPin} title="Governing law">
                    <p>
                        These terms are governed by the laws of the Republic of
                        Lebanon. Any dispute arising out of the hosted demo will be
                        resolved by the competent courts of Beirut. This is a
                        reasonable default for a Beirut-based maintainer and the
                        hosted demo only.
                    </p>
                    <p>
                        If you self-host Louis, this clause does not apply to you.
                        Your jurisdiction and your contracts with your own users
                        govern.
                    </p>
                </Section>

                <Section icon={RefreshCcw} title="Changes">
                    <p>
                        We will update this page in place and bump the
                        &quot;last updated&quot; date when something changes.
                        Material changes — anything that meaningfully shifts the
                        deal — get announced in the repository README or in-product.
                    </p>
                </Section>

                <p className="mt-12 text-sm text-gray-600">
                    Questions or concerns? Open an issue at{" "}
                    <a
                        href={`${REPO_URL}/issues`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-800 underline"
                    >
                        the repository
                    </a>{" "}
                    or email the maintainer (address listed on the GitHub profile).
                    See also our{" "}
                    <Link href="/privacy" className="text-amber-800 underline">
                        privacy policy
                    </Link>{" "}
                    and the{" "}
                    <Link href="/transparency" className="text-amber-800 underline">
                        EU AI Act transparency report
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
