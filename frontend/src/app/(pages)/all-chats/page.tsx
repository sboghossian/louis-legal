"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, LayoutGrid, List, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// SCAFFOLD: ported from haqq-prototype `renderAllChats`. Cards vs list view with category filter.

interface Chat {
    id: string;
    title: string;
    when: string;
    category: "draft" | "review" | "research" | "translate" | "calculate" | "advice";
    preview: string;
    msgCount: number;
}

const CHATS: Chat[] = [
    { id: "c1", title: "Acme x Globex MSA — redline",            when: "2h ago",    category: "review",   msgCount: 14, preview: "Liability cap at 12 months is favourable; recommend 24 months as fallback…" },
    { id: "c2", title: "Saudi labor contract for marketing",      when: "yesterday", category: "draft",    msgCount: 22, preview: "I've drafted a definite-term contract with 90-day probation, 21-day annual leave…" },
    { id: "c3", title: "Non-compete enforceability MENA",         when: "2d ago",    category: "research", msgCount: 8,  preview: "KSA Labor Law Art 83 allows up to 2 years; UAE Decree-Law 33/2021 narrowed scope…" },
    { id: "c4", title: "End-of-service for 6yr UAE employee",     when: "3d ago",    category: "calculate", msgCount: 5, preview: "Total: 21 × 5 + 30 × 1 = 135 days basic salary; capped at 2 years total." },
    { id: "c5", title: "Translate MSA — English to Arabic",       when: "4d ago",    category: "translate", msgCount: 3, preview: "Side-by-side bilingual draft with controlling-Arabic statement." },
    { id: "c6", title: "Should I sign this NDA?",                 when: "5d ago",    category: "advice",   msgCount: 11, preview: "Term of 10 years is unusually long; carve-outs missing for already-public info…" },
    { id: "c7", title: "DIFC vs ADGM for our SPV",                when: "1w ago",    category: "research", msgCount: 17, preview: "Both are common-law overlays; DIFC has older case law, ADGM has clearer crypto regime…" },
    { id: "c8", title: "Founders agreement for 3-way split",      when: "1w ago",    category: "draft",    msgCount: 9,  preview: "Vesting 4-year + 1-year cliff; reverse vesting on founder departure; ROFR…" },
];

const CATEGORIES = ["all", "draft", "review", "research", "translate", "calculate", "advice"] as const;

const CAT_COLOR: Record<string, string> = {
    draft: "bg-blue-100 text-blue-700",
    review: "bg-purple-100 text-purple-700",
    research: "bg-green-100 text-green-700",
    translate: "bg-yellow-100 text-yellow-800",
    calculate: "bg-orange-100 text-orange-700",
    advice: "bg-rose-100 text-rose-700",
};

export default function AllChatsPage() {
    const router = useRouter();
    const [view, setView] = useState<"cards" | "list">("cards");
    const [q, setQ] = useState("");
    const [category, setCategory] = useState<typeof CATEGORIES[number]>("all");

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return CHATS.filter(c => {
            if (category !== "all" && c.category !== category) return false;
            if (needle && !(c.title + " " + c.preview).toLowerCase().includes(needle)) return false;
            return true;
        });
    }, [q, category]);

    return (
        <div className="max-w-6xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-5 h-5" />
                <h1 className="text-lg font-semibold">All chats</h1>
                <Badge variant="secondary">{filtered.length}</Badge>
                <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center bg-gray-100 rounded p-0.5">
                        <button onClick={() => setView("cards")} className={`px-2 py-1 rounded ${view === "cards" ? "bg-white shadow-sm" : "text-gray-500"}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setView("list")} className={`px-2 py-1 rounded ${view === "list" ? "bg-white shadow-sm" : "text-gray-500"}`}><List className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search chats…" className="pl-9" />
                </div>
                <Button variant="outline" size="sm" className="h-9">
                    <Filter className="w-3.5 h-3.5 mr-1" /> Advanced
                </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-6">
                {CATEGORIES.map(c => (
                    <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`px-2.5 py-1 text-xs rounded-full border ${category === c ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            {view === "cards" ? (
                <div className="grid grid-cols-2 gap-4">
                    {filtered.map(c => (
                        <button key={c.id} onClick={() => router.push(`/assistant/chat/${c.id}`)} className="border border-gray-200 rounded-lg p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${CAT_COLOR[c.category]}`}>{c.category}</span>
                                <span className="text-[10px] text-gray-500">{c.when}</span>
                            </div>
                            <div className="font-medium text-sm mb-1.5 line-clamp-2">{c.title}</div>
                            <div className="text-xs text-gray-500 line-clamp-2">{c.preview}</div>
                            <div className="text-[10px] text-gray-400 mt-2">{c.msgCount} messages</div>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {filtered.map(c => (
                        <button key={c.id} onClick={() => router.push(`/assistant/chat/${c.id}`)} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${CAT_COLOR[c.category]} w-20 text-center flex-shrink-0`}>{c.category}</span>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{c.title}</div>
                                <div className="text-xs text-gray-500 truncate">{c.preview}</div>
                            </div>
                            <span className="text-[10px] text-gray-500 w-16 text-right flex-shrink-0">{c.when}</span>
                            <span className="text-[10px] text-gray-400 w-12 text-right flex-shrink-0">{c.msgCount} msg</span>
                        </button>
                    ))}
                </div>
            )}

            {!filtered.length && (
                <div className="text-center py-12 text-sm text-gray-500">No chats match the filters.</div>
            )}
        </div>
    );
}
