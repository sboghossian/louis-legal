"use client";

/**
 * Prompt Library — browse Louis's curated prompt-pack skills (~150 templates
 * ported from haqq.ai/prompt-library). Filter by use case + practice area,
 * click a card to seed the composer at /assistant.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Search, ArrowUpRight, Copy, Check } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

interface PromptEntry {
    id: string;
    name: string;
    practice_area: string | null;
    intent: string[];
    description: string | null;
    template: string;
}

const USE_CASES: {
    id: string;
    labelKey: string;
    match: (e: PromptEntry) => boolean;
}[] = [
    {
        id: "all",
        labelKey: "prompts.use_case.all",
        match: () => true,
    },
    {
        id: "draft",
        labelKey: "prompts.use_case.draft",
        match: (e) =>
            e.intent.some((i) => /draft|generate/i.test(i)) ||
            /draft|generate/i.test(e.description ?? ""),
    },
    {
        id: "review",
        labelKey: "prompts.use_case.review",
        match: (e) =>
            e.intent.some((i) => /review|redline/i.test(i)) ||
            /review|redline/i.test(e.description ?? ""),
    },
    {
        id: "summarize",
        labelKey: "prompts.use_case.summarize",
        match: (e) =>
            e.intent.some((i) => /summari|extract/i.test(i)) ||
            /summari|extract/i.test(e.description ?? ""),
    },
    {
        id: "research",
        labelKey: "prompts.use_case.research",
        match: (e) =>
            e.intent.some((i) => /research|authorit|case-law|statute/i.test(i)),
    },
    {
        id: "compliance",
        labelKey: "prompts.use_case.compliance",
        match: (e) =>
            e.intent.some((i) =>
                /compliance|diligence|kyc|aml|sanctions/i.test(i),
            ),
    },
    {
        id: "strategy",
        labelKey: "prompts.use_case.strategy",
        match: (e) =>
            e.intent.some((i) => /strategy|scenario|negotiation/i.test(i)),
    },
];

const PRACTICE_AREA_LABELS: Record<string, string> = {
    "corporate-commercial": "Corporate / Commercial",
    "privacy-data-protection": "Privacy & Data Protection",
    "employment": "Employment",
    "disputes-litigation": "Disputes / Litigation",
    "fintech-payments": "FinTech / Payments",
    "corporate-ma": "Corporate M&A",
    "arbitration": "Arbitration",
    "corporate-governance": "Corporate Governance",
    "legal-ops-billing": "Legal Ops / Billing",
    "ip-licensing": "IP / Licensing",
};

function practiceAreaLabel(id: string | null): string {
    if (!id) return "Other";
    return (
        PRACTICE_AREA_LABELS[id] ??
        id
            .split(/[-_]/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
    );
}

export default function PromptLibraryPage() {
    const router = useRouter();
    const { t } = useLocale();
    const [entries, setEntries] = useState<PromptEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [useCase, setUseCase] = useState("all");
    const [practiceArea, setPracticeArea] = useState<string>("all");
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_BASE}/api/skills/prompt-library`)
            .then((r) => r.json())
            .then((json: { entries: PromptEntry[] }) => {
                setEntries(json.entries ?? []);
                setLoading(false);
            })
            .catch((e) => {
                setError(String(e));
                setLoading(false);
            });
    }, []);

    const practiceAreas = useMemo(() => {
        const set = new Set<string>();
        for (const e of entries) if (e.practice_area) set.add(e.practice_area);
        return ["all", ...Array.from(set).sort()];
    }, [entries]);

    const filtered = useMemo(() => {
        const useCaseFn = USE_CASES.find((u) => u.id === useCase)?.match;
        const needle = query.trim().toLowerCase();
        return entries.filter((e) => {
            if (useCaseFn && !useCaseFn(e)) return false;
            if (practiceArea !== "all" && e.practice_area !== practiceArea)
                return false;
            if (!needle) return true;
            return (
                e.name.toLowerCase().includes(needle) ||
                e.id.toLowerCase().includes(needle) ||
                (e.description ?? "").toLowerCase().includes(needle) ||
                e.template.toLowerCase().includes(needle)
            );
        });
    }, [entries, query, useCase, practiceArea]);

    function useInComposer(entry: PromptEntry) {
        if (typeof window !== "undefined") {
            sessionStorage.setItem(
                "louis.initialPrompt",
                entry.template || entry.name,
            );
        }
        router.push("/assistant");
    }

    async function copyTemplate(entry: PromptEntry) {
        try {
            await navigator.clipboard.writeText(entry.template || entry.name);
            setCopiedId(entry.id);
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            // ignore
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8">
            <div className="flex items-center gap-2 mb-2">
                <Library className="w-5 h-5 text-amber-700" />
                <h1 className="text-xl font-serif font-semibold tracking-tight">
                    {t("prompts.title")}
                </h1>
            </div>
            <p className="text-sm text-muted-foreground font-serif mb-6 max-w-2xl">
                {t("prompts.intro", { count: entries.length })}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
                {USE_CASES.map((uc) => (
                    <button
                        key={uc.id}
                        onClick={() => setUseCase(uc.id)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            useCase === uc.id
                                ? "bg-foreground text-white border-foreground"
                                : "bg-card text-foreground/80 border-border hover:bg-muted"
                        }`}
                    >
                        {t(uc.labelKey)}
                    </button>
                ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t("prompts.search_placeholder")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                    />
                </div>
                <select
                    value={practiceArea}
                    onChange={(e) => setPracticeArea(e.target.value)}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-amber-200"
                >
                    {practiceAreas.map((pa) => (
                        <option key={pa} value={pa}>
                            {pa === "all"
                                ? t("prompts.all_practice_areas")
                                : practiceAreaLabel(pa)}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div
                            key={i}
                            className="border border-border rounded-xl p-4 bg-card space-y-3"
                        >
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-1/3" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-5/6" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-sm text-red-600 py-12 text-center">
                    Failed to load: {error}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-sm text-muted-foreground py-12 text-center">
                    {t("prompts.empty")}
                </div>
            ) : (
                <>
                    <div className="text-xs text-muted-foreground mb-3">
                        {t("prompts.showing", {
                            count: filtered.length,
                            total: entries.length,
                        })}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filtered.map((entry) => (
                            <PromptCard
                                key={entry.id}
                                entry={entry}
                                onUse={() => useInComposer(entry)}
                                onCopy={() => copyTemplate(entry)}
                                isCopied={copiedId === entry.id}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function PromptCard({
    entry,
    onUse,
    onCopy,
    isCopied,
}: {
    entry: PromptEntry;
    onUse: () => void;
    onCopy: () => void;
    isCopied: boolean;
}) {
    const { t } = useLocale();
    return (
        <div className="border border-border rounded-xl p-4 bg-card hover:shadow-sm hover:border-amber-300 transition-all flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-serif font-medium text-[15px] leading-snug text-foreground">
                    {entry.name}
                </h3>
                <button
                    onClick={onCopy}
                    className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground/80 hover:bg-muted"
                    title={t("prompts.copy_template")}
                >
                    {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                        <Copy className="w-3.5 h-3.5" />
                    )}
                </button>
            </div>
            <div className="text-[10px] uppercase tracking-wide text-amber-700 mb-2">
                {practiceAreaLabel(entry.practice_area)}
            </div>
            {entry.template && (
                <p className="text-xs text-muted-foreground font-serif leading-relaxed line-clamp-4 flex-1">
                    {entry.template}
                </p>
            )}
            <button
                onClick={onUse}
                className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-foreground text-white hover:bg-foreground transition-colors"
            >
                {t("prompts.use_button")}
                <ArrowUpRight className="w-3 h-3" />
            </button>
        </div>
    );
}
