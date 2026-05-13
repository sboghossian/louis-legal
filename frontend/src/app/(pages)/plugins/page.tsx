"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Blocks,
    Mail,
    MessageSquare,
    Zap,
    ExternalLink,
    Search,
    BadgeCheck,
    Github,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface PluginManifest {
    id: string;
    name: string;
    description: string;
    icon: string;
    install_url: string;
    repo_url: string;
    category: "communication" | "productivity" | "automation" | string;
    author: string;
    version: string;
    verified: boolean;
}

// Tiny icon registry so we can use Lucide icons by string name from the
// backend manifest without bundling every icon in the library.
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
    Mail,
    MessageSquare,
    Zap,
    Blocks,
};

export default function PluginsPage() {
    const [plugins, setPlugins] = useState<PluginManifest[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await fetch(`${API_BASE}/api/v1/plugins`);
                const j = await r.json();
                if (!cancelled) setPlugins(j.data?.plugins ?? []);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return plugins;
        return plugins.filter(
            (p) =>
                (p.name + " " + p.description + " " + p.category)
                    .toLowerCase()
                    .includes(needle),
        );
    }, [plugins, q]);

    return (
        <div className="min-h-screen bg-[#fbf8f2]">
            <div className="max-w-6xl mx-auto px-8 py-12">
                {/* Hero — Apple quiet-luxury / gold-leaf accent */}
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Blocks className="w-5 h-5 text-amber-700" />
                        <span className="text-xs uppercase tracking-[0.18em] text-amber-700 font-medium">
                            Marketplace
                        </span>
                    </div>
                    <h1
                        className="text-4xl font-serif text-stone-900 mb-3"
                        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                    >
                        Louis plug-ins
                    </h1>
                    <p className="text-stone-600 max-w-2xl leading-relaxed">
                        First-party extensions, maintained in-house by the Louis team.
                        Each plug-in is open-source, AGPL-licensed, and built against
                        the public{" "}
                        <a href="/docs" className="text-amber-700 underline decoration-amber-300 underline-offset-4 hover:decoration-amber-600">
                            developer API
                        </a>
                        .
                    </p>
                </div>

                {/* Search */}
                <div className="relative mb-8 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search plug-ins…"
                        className="pl-9 bg-white/60 border-stone-300 focus-visible:ring-amber-600/30"
                    />
                </div>

                {loading && (
                    <div className="text-sm text-stone-500">Loading marketplace…</div>
                )}

                {!loading && filtered.length === 0 && (
                    <div className="text-sm text-stone-500">
                        No plug-ins match that search.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((p) => (
                        <PluginCard key={p.id} plugin={p} />
                    ))}
                </div>

                {/* Footer band — pointers to building your own */}
                <div className="mt-16 border-t border-stone-200 pt-8">
                    <h3
                        className="text-lg font-serif text-stone-900 mb-2"
                        style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
                    >
                        Building your own plug-in?
                    </h3>
                    <p className="text-sm text-stone-600 max-w-2xl mb-4">
                        Use the Louis SDK and the SSE event stream to wire any external
                        tool into Louis. Mint an API token, point your plug-in at{" "}
                        <code className="px-1.5 py-0.5 bg-stone-100 rounded text-xs text-amber-800">
                            /api/v1/events
                        </code>
                        , and react to matters, documents, and chat turns in real time.
                    </p>
                    <div className="flex gap-2">
                        <a
                            href="/docs"
                            className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-800 font-medium"
                        >
                            Read the docs <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <span className="text-stone-300">·</span>
                        <a
                            href="https://github.com/sboghossian/louis-plugins"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-800"
                        >
                            <Github className="w-3.5 h-3.5" /> Plug-in repo
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PluginCard({ plugin }: { plugin: PluginManifest }) {
    const Icon = ICON_MAP[plugin.icon] ?? Blocks;
    return (
        <div className="group bg-white border border-stone-200 rounded-xl p-5 flex flex-col hover:border-amber-300 hover:shadow-[0_2px_24px_-12px_rgba(180,140,40,0.25)] transition-all">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/60 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <h3
                            className="font-serif text-base text-stone-900 truncate"
                            style={{
                                fontFamily: "var(--font-serif), Georgia, serif",
                            }}
                        >
                            {plugin.name}
                        </h3>
                        {plugin.verified && (
                            <BadgeCheck
                                className="w-4 h-4 text-amber-600 shrink-0"
                                aria-label="Verified by Louis team"
                            />
                        )}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                        {plugin.author} · v{plugin.version}
                    </div>
                </div>
            </div>

            <p className="text-sm text-stone-600 leading-relaxed mb-4 line-clamp-4 min-h-[5em]">
                {plugin.description}
            </p>

            <div className="mt-auto flex items-center gap-2">
                <Badge
                    variant="secondary"
                    className="bg-stone-100 text-stone-700 capitalize text-[10px] font-medium"
                >
                    {plugin.category}
                </Badge>
                <div className="ml-auto flex gap-2">
                    <a
                        href={plugin.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-400 hover:text-stone-700 transition-colors"
                        title="View source on GitHub"
                    >
                        <Github className="w-4 h-4" />
                    </a>
                    <Button
                        asChild
                        size="sm"
                        className="h-7 text-xs bg-amber-700 hover:bg-amber-800 text-white"
                    >
                        <a href={plugin.install_url} target="_blank" rel="noreferrer">
                            Install
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
