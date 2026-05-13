"use client";

/**
 * Referral was a paid-conversion incentive — irrelevant for a free
 * product. We replace the surface with a "Share Louis" page: copy the
 * repo URL, open a pre-filled tweet/LinkedIn post, send a colleague an
 * email. No tracking, no rewards, just spread the word.
 */

import { useState } from "react";
import {
    Share2,
    Github,
    Twitter,
    Linkedin,
    Mail,
    MessageSquare,
    Copy,
    Check,
} from "lucide-react";

const REPO_URL = "https://github.com/sboghossian/louis-legal";
const SITE_URL = "https://legal.dashable.dev";
const PITCH =
    "Louis — the open-source legal AI workbench. MIT licensed, bring your own API key, self-hostable. The free alternative to Harvey / Legora / CoCounsel.";

export default function ShareLouisPage() {
    const [copied, setCopied] = useState<string | null>(null);

    function copy(text: string, key: string) {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key);
            setTimeout(() => setCopied(null), 1500);
        });
    }

    const tweet = encodeURIComponent(`${PITCH} ${SITE_URL}`);
    const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}`;
    const mailBody = encodeURIComponent(
        `I've been using Louis — an open-source legal AI workbench that runs on your own API key.\n\nIt's MIT licensed, self-hostable, and free forever:\n\n${SITE_URL}\n${REPO_URL}\n\nWorth a look.`,
    );

    return (
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10">
            <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-5 h-5 text-amber-700" />
                <h1 className="text-2xl font-serif font-semibold">Share Louis</h1>
            </div>
            <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                Louis is free and open source. The most useful thing you can do
                is tell another lawyer or legal-tech engineer about it.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ShareCard
                    icon={Twitter}
                    title="Post on X / Twitter"
                    href={`https://twitter.com/intent/tweet?text=${tweet}`}
                />
                <ShareCard
                    icon={Linkedin}
                    title="Share on LinkedIn"
                    href={linkedinShare}
                />
                <ShareCard
                    icon={Mail}
                    title="Email a colleague"
                    href={`mailto:?subject=${encodeURIComponent("Have you tried Louis?")}&body=${mailBody}`}
                />
                <ShareCard
                    icon={MessageSquare}
                    title="Tell your group chat"
                    onClick={() => copy(`${PITCH} ${SITE_URL}`, "pitch")}
                    badge={copied === "pitch" ? "Copied!" : "Copy pitch"}
                />
                <ShareCard
                    icon={Github}
                    title="Star on GitHub"
                    href={REPO_URL}
                />
                <ShareCard
                    icon={Copy}
                    title="Copy the link"
                    onClick={() => copy(SITE_URL, "url")}
                    badge={copied === "url" ? "Copied!" : SITE_URL}
                />
            </div>

            <div className="mt-10 rounded-xl border border-[#e7e2d6] bg-[#fbf8f2] p-5">
                <div className="text-xs uppercase tracking-wider text-amber-700 mb-2">
                    Suggested copy
                </div>
                <p className="text-sm text-foreground/80 font-serif leading-relaxed mb-3">
                    {PITCH}
                </p>
                <button
                    onClick={() => copy(PITCH, "blurb")}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80 hover:text-foreground"
                >
                    {copied === "blurb" ? (
                        <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            Copied
                        </>
                    ) : (
                        <>
                            <Copy className="w-3 h-3" />
                            Copy this paragraph
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

function ShareCard({
    icon: Icon,
    title,
    href,
    onClick,
    badge,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    href?: string;
    onClick?: () => void;
    badge?: string;
}) {
    const body = (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{title}</div>
                {badge && (
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {badge}
                    </div>
                )}
            </div>
        </div>
    );
    return href ? (
        <a href={href} target="_blank" rel="noreferrer">
            {body}
        </a>
    ) : (
        <button type="button" onClick={onClick} className="text-left">
            {body}
        </button>
    );
}
