"use client";

import { Info, Github, ExternalLink, Heart, BookOpen, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LouisMark } from "@/components/brand/louis-mark";
import Link from "next/link";

const VERSION = "0.8.0-louis";
const REPO_URL = "https://github.com/sboghossian/louis-legal";
const UPSTREAM_URL = "https://github.com/willchen96/mike";

const STACK = [
    { layer: "Frontend", tech: "Next.js 15 · React 19 · Tailwind · Shadcn UI" },
    { layer: "Backend", tech: "Express · TypeScript · Supabase Postgres" },
    { layer: "AI", tech: "Anthropic Claude · Google Gemini · OpenAI · Voyage embeddings" },
    { layer: "Storage", tech: "Cloudflare R2 · Supabase Storage" },
    { layer: "Auth", tech: "Supabase Auth (OAuth + SAML)" },
    { layer: "Observability", tech: "PostHog · BetterStack · Honeycomb · Sentry" },
];

const CREDITS = [
    { name: "willchen96", role: "Mike (upstream fork)", url: "https://github.com/willchen96/mike" },
    { name: "HAQQ team", role: "Comfort-UI vision, MENA skills authoring", url: "https://haqq.ai" },
    { name: "Anthropic Claude", role: "Skill authoring + this very codebase", url: "https://claude.com/claude-code" },
];

export default function AboutPage() {
    return (
        <div className="max-w-4xl mx-auto px-8 py-10">
            {/* Hero */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center mb-3"><LouisMark size={56} /></div>
                <h1 className="text-3xl font-semibold mb-2">Louis</h1>
                <p className="text-muted-foreground mb-2">MENA-first legal AI infrastructure for individuals, firms, and in-house teams.</p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">v{VERSION}</Badge>
                    <span>·</span>
                    <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                        <Github className="w-3 h-3" /> open source
                    </a>
                    <span>·</span>
                    <span>983 skills</span>
                    <span>·</span>
                    <span>30+ jurisdictions</span>
                </div>
            </div>

            {/* What Louis is */}
            <Section icon={Info} title="What Louis is">
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                    Louis is <strong>AI infrastructure for legal</strong> — the
                    open-source stack we wished existed: a chat assistant that
                    knows lawyering, a document workspace with real
                    tracked-change redlining, a clause + citation library, a
                    contract risk scanner, a tabular reviewer for
                    due-diligence batches, calculators for end-of-service
                    benefits across MENA, and a 983-skill library that biases
                    every turn toward how actual lawyers draft, review, and
                    reason.
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                    It&apos;s designed to feel built for lawyers — bilingual,
                    jurisdiction-aware, transparent about what the AI is
                    doing (the skill router shows which skills fired on every
                    turn), and BYO-key by default so client data never has to
                    pass through a vendor in the middle.
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                    Underneath it&apos;s open-source: forked from{" "}
                    <a
                        href={UPSTREAM_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                    >
                        Mike
                    </a>{" "}
                    (a generalist chat-with-docs base by{" "}
                    <a
                        href="https://github.com/willchen96"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                    >
                        willchen96
                    </a>
                    ) and rebuilt around the comfort-UI vision we developed
                    at HAQQ.
                </p>
            </Section>

            {/* Why "Louis" */}
            <Section icon={Scale} title="Why we named it Louis">
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                    Some assistants are named for the founder. Some for an
                    acronym. We named ours after a character.
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                    On <em>Suits</em>, Harvey is the closer and Mike is the
                    self-taught savant — but{" "}
                    <strong>Louis Litt</strong> is the one who actually
                    <em> reads the file</em>. He&apos;s the mergers-and-
                    acquisitions encyclopedia, the bylaws nerd, the one
                    Donna calls when the deal needs a specialist who&apos;ll
                    catch the thing in the footnote. If you put Harvey, Mike,
                    and Louis in a room and asked Donna which one would
                    actually do the work — she&apos;d pick Louis.
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">
                    That&apos;s the bar we set for an AI legal workbench: not
                    the most charming and not the flashiest, but the one
                    you&apos;d hand a contract to.
                </p>
            </Section>

            {/* Open source */}
            <Section icon={Github} title="Open source">
                <p className="text-sm text-foreground/80 mb-3">
                    Louis is released under the MIT license — fork it, self-host it, extend it, ship your own legal AI.
                    The whole skill library lives as plain markdown files in <code className="text-xs bg-muted px-1 rounded">backend/src/skills/</code>.
                </p>
                <div className="flex gap-2">
                    <a href={REPO_URL} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                            <Github className="w-3.5 h-3.5 mr-1" /> louis-legal on GitHub
                        </Button>
                    </a>
                    <a href={UPSTREAM_URL} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="sm">
                            Upstream: willchen96/mike <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                    </a>
                </div>
            </Section>

            {/* Stack */}
            <Section icon={BookOpen} title="What it&apos;s built on">
                <div className="border border-border rounded-lg divide-y divide-border">
                    {STACK.map(s => (
                        <div key={s.layer} className="px-4 py-2.5 flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground/80">{s.layer}</span>
                            <span className="text-muted-foreground">{s.tech}</span>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Credits */}
            <Section icon={Heart} title="Credits">
                <ul className="space-y-2 text-sm">
                    {CREDITS.map(c => (
                        <li key={c.name} className="flex items-center gap-2">
                            <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">{c.name}</a>
                            <span className="text-muted-foreground">— {c.role}</span>
                        </li>
                    ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-4">
                    Louis stands on the shoulders of open source. If you build on top, tell us what you ship — we&apos;ll feature it.
                </p>
            </Section>

            {/* Footer CTA */}
            <div className="mt-12 text-center text-xs text-muted-foreground">
                <p>Made with ❤︎ in Beirut + Dubai. Powered by Claude, Gemini, GPT.</p>
                <p className="mt-2">
                    <Link href="/docs" className="text-blue-600 hover:underline">Documentation</Link>
                    {" · "}
                    <Link href="/integrations" className="text-blue-600 hover:underline">Integrations</Link>
                    {" · "}
                    <Link href="/skills" className="text-blue-600 hover:underline">Skills</Link>
                    {" · "}
                    <Link href="/settings/api-keys" className="text-blue-600 hover:underline">API keys</Link>
                </p>
            </div>
        </div>
    );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
    return (
        <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-foreground/80" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">{title}</h2>
            </div>
            {children}
        </section>
    );
}
