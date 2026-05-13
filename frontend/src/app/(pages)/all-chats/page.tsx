"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Search, LayoutGrid, List, Filter, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listChats, deleteChat } from "@/app/lib/louisApi";
import type { LouisChat } from "@/app/components/shared/types";
import { useConfirm } from "@/app/contexts/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { useLocale } from "@/contexts/LocaleContext";

interface ChatRow {
    id: string;
    title: string;
    when: string;
    category: string;
    createdAt: string;
}

const CATEGORIES = ["all", "draft", "review", "research", "translate", "calculate", "advice"] as const;

const CAT_COLOR: Record<string, string> = {
    draft: "bg-blue-100 text-blue-700",
    review: "bg-purple-100 text-purple-700",
    research: "bg-green-100 text-green-700",
    translate: "bg-yellow-100 text-yellow-800",
    calculate: "bg-orange-100 text-orange-700",
    advice: "bg-rose-100 text-rose-700",
    other: "bg-muted text-foreground/80",
};

function inferCategory(title: string): string {
    const t = (title || "").toLowerCase();
    if (/draft|nda|contract|agreement|letter/.test(t)) return "draft";
    if (/review|redline|compare|risk|sanity/.test(t)) return "review";
    if (/research|precedent|enforceability|jurisdiction|case law/.test(t)) return "research";
    if (/translate|arabic|french|spanish/.test(t)) return "translate";
    if (/calc|eos|deadline|stamp duty|tax/.test(t)) return "calculate";
    if (/advice|opinion|should i|recommend/.test(t)) return "advice";
    return "other";
}

function relativeTime(iso: string): string {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
}

export default function AllChatsPage() {
    const router = useRouter();
    const confirm = useConfirm();
    const { toast } = useToast();
    const { t } = useLocale();
    const [chats, setChats] = useState<LouisChat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<"cards" | "list">("cards");
    const [q, setQ] = useState("");
    const [category, setCategory] = useState<string>("all");

    async function refresh() {
        setLoading(true);
        setError(null);
        try {
            const list = await listChats();
            setChats(list ?? []);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { refresh(); }, []);

    const rows: ChatRow[] = useMemo(() => chats.map(c => ({
        id: c.id,
        title: c.title || t("common.untitled_chat"),
        when: relativeTime(c.created_at),
        category: inferCategory(c.title || ""),
        createdAt: c.created_at,
    })), [chats, t]);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return rows.filter(c => {
            if (category !== "all" && c.category !== category) return false;
            if (needle && !c.title.toLowerCase().includes(needle)) return false;
            return true;
        });
    }, [rows, q, category]);

    async function remove(id: string, title: string) {
        const ok = await confirm({
            title: t("all_chats.delete.title"),
            message: t("all_chats.delete.message", { title }),
            destructive: true,
        });
        if (!ok) return;
        try {
            await deleteChat(id);
            refresh();
        } catch (e) {
            toast({
                title: t("all_chats.delete.failed"),
                description: (e as Error).message,
                variant: "error",
            });
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-8 py-8">
            <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-5 h-5" />
                <h1 className="text-lg font-semibold">{t("all_chats.title")}</h1>
                <Badge variant="secondary">{filtered.length}</Badge>
                <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center bg-muted rounded p-0.5">
                        <button onClick={() => setView("cards")} className={`px-2 py-1 rounded ${view === "cards" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setView("list")} className={`px-2 py-1 rounded ${view === "list" ? "bg-card shadow-sm" : "text-muted-foreground"}`}><List className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t("all_chats.search_placeholder")} className="pl-9" />
                </div>
                <Button variant="outline" size="sm" className="h-9" onClick={refresh}>
                    <Filter className="w-3.5 h-3.5 mr-1" /> {t("action.refresh")}
                </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-6">
                {CATEGORIES.map(c => (
                    <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`px-2.5 py-1 text-xs rounded-full border ${category === c ? "bg-foreground text-white border-foreground" : "bg-card text-foreground/80 border-border hover:bg-muted"}`}
                    >
                        {t(`category.${c}`)}
                    </button>
                ))}
            </div>

            {loading && <div className="text-sm text-muted-foreground py-6 text-center">{t("common.loading")}</div>}
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{error}</div>}

            {!loading && view === "cards" && (
                <div className="grid grid-cols-2 gap-4">
                    {filtered.map(c => (
                        <div key={c.id} className="group relative border border-border rounded-lg p-4 hover:border-border hover:shadow-sm transition-all">
                            <button onClick={() => router.push(`/assistant/chat/${c.id}`)} className="block w-full text-left">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${CAT_COLOR[c.category] || CAT_COLOR.other}`}>{t(`category.${c.category}`)}</span>
                                    <span className="text-[10px] text-muted-foreground">{c.when}</span>
                                </div>
                                <div className="font-medium text-sm mb-1.5 line-clamp-2">{c.title}</div>
                            </button>
                            <button
                                onClick={() => remove(c.id, c.title)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-opacity"
                                title={t("all_chats.delete.tooltip")}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {!loading && view === "list" && (
                <div className="border border-border rounded-lg divide-y divide-border">
                    {filtered.map(c => (
                        <div key={c.id} className="group w-full flex items-center gap-3 px-4 py-3 hover:bg-muted">
                            <button onClick={() => router.push(`/assistant/chat/${c.id}`)} className="flex-1 flex items-center gap-3 text-left">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${CAT_COLOR[c.category] || CAT_COLOR.other} w-20 text-center flex-shrink-0`}>{t(`category.${c.category}`)}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{c.title}</div>
                                </div>
                                <span className="text-[10px] text-muted-foreground w-20 text-right flex-shrink-0">{c.when}</span>
                            </button>
                            <button
                                onClick={() => remove(c.id, c.title)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-opacity"
                                title={t("all_chats.delete.tooltip")}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {!loading && !filtered.length && (
                <div className="text-center py-12 text-sm text-muted-foreground">
                    {chats.length === 0 ? (
                        <>
                            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
                            <div className="font-medium text-foreground mb-1">{t("all_chats.empty.title")}</div>
                            <div className="mb-3">{t("all_chats.empty.intro")}</div>
                            <Button size="sm" onClick={() => router.push("/assistant")}>{t("all_chats.empty.cta")}</Button>
                        </>
                    ) : t("all_chats.empty.no_filter")}
                </div>
            )}
        </div>
    );
}
