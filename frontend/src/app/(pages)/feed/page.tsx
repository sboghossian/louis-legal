"use client";

/**
 * Newsfeed — Reddit-backed legal industry stream.
 *
 * Topics are stored on the user's profile. New users get the default list
 * (Legal, Big Law, Legal AI, Legal Tech, named products…). The user can add
 * topics by typing a label + subreddits + keywords; each topic fans out to
 * Reddit's public JSON on the backend (with 5-min server-side caching).
 *
 * Filter chips at the top let you focus a single topic. The big refresh
 * button bypasses the local memo so you can pull "now."
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Rss,
    RefreshCw,
    Plus,
    X,
    MessageSquare,
    ArrowUpRight,
    Trash2,
    Save,
} from "lucide-react";
import {
    fetchFeed,
    getFeedDefaults,
    updateUserProfile,
    type FeedItem,
    type FeedTopic,
} from "@/app/lib/louisApi";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useToast } from "@/contexts/ToastContext";
import { Skeleton } from "@/components/ui/skeleton";

function timeAgo(unixSeconds: number): string {
    const diff = Math.max(0, Date.now() / 1000 - unixSeconds);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)} min`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hr`;
    return `${Math.round(diff / 86400)} d`;
}

function slugify(label: string): string {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function FeedPage() {
    const { isAuthenticated } = useAuth();
    const { profile, reloadProfile } = useUserProfile();
    const { t } = useLocale();
    const { toast } = useToast();

    const [topics, setTopics] = useState<FeedTopic[] | null>(null);
    const [items, setItems] = useState<FeedItem[]>([]);
    const [activeTopicId, setActiveTopicId] = useState<string | "all">("all");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savingTopics, setSavingTopics] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [newLabel, setNewLabel] = useState("");
    const [newSubs, setNewSubs] = useState("");
    const [newKeywords, setNewKeywords] = useState("");

    // Seed topics — prefer the user's saved feeds, fall back to defaults.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                if (profile?.feeds && profile.feeds.length > 0) {
                    if (!cancelled) setTopics(profile.feeds);
                } else {
                    const { topics: defaults } = await getFeedDefaults();
                    if (!cancelled) setTopics(defaults);
                }
            } catch (e) {
                if (!cancelled) setError(String(e));
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [profile?.feeds]);

    const refresh = useCallback(
        async (topicList: FeedTopic[]) => {
            setRefreshing(true);
            setError(null);
            try {
                const { items: fetched } = await fetchFeed(topicList);
                setItems(fetched);
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [],
    );

    useEffect(() => {
        if (topics === null) return;
        void refresh(topics);
    }, [topics, refresh]);

    const filtered = useMemo(() => {
        if (activeTopicId === "all") return items;
        return items.filter((i) => i.topicId === activeTopicId);
    }, [items, activeTopicId]);

    async function persistTopics(next: FeedTopic[]) {
        setTopics(next);
        if (!isAuthenticated) return;
        try {
            setSavingTopics(true);
            await updateUserProfile({ feeds: next });
            await reloadProfile();
            toast({ title: "Topics saved", variant: "success" });
        } catch (e) {
            const detail = e instanceof Error ? e.message : String(e);
            setError(detail);
            toast({
                title: "Failed to save topics",
                description: detail,
                variant: "error",
            });
        } finally {
            setSavingTopics(false);
        }
    }

    function addTopic() {
        const label = newLabel.trim();
        if (!label) return;
        const subs = newSubs
            .split(/[,\n\s]+/)
            .map((s) => s.replace(/^r\//i, "").trim())
            .filter(Boolean);
        const kws = newKeywords
            .split(/[,\n]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        if (subs.length === 0 && kws.length === 0) {
            setError(t("feed.error_min"));
            return;
        }
        const id = `${slugify(label) || "topic"}-${Date.now()
            .toString(36)
            .slice(-4)}`;
        const next: FeedTopic[] = [
            ...(topics ?? []),
            { id, label, subreddits: subs, keywords: kws },
        ];
        void persistTopics(next);
        setNewLabel("");
        setNewSubs("");
        setNewKeywords("");
        setShowAdd(false);
    }

    function removeTopic(id: string) {
        const next = (topics ?? []).filter((t) => t.id !== id);
        void persistTopics(next);
        if (activeTopicId === id) setActiveTopicId("all");
    }

    async function resetToDefaults() {
        try {
            const { topics: defaults } = await getFeedDefaults();
            await persistTopics(defaults);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
            <div className="flex items-center gap-2 mb-1">
                <Rss className="w-5 h-5 text-amber-700" />
                <h1 className="text-xl font-serif font-semibold tracking-tight">
                    {t("feed.title")}
                </h1>
                {savingTopics && (
                    <span className="text-xs text-gray-500 ml-2">{t("feed.saving")}</span>
                )}
                <button
                    type="button"
                    onClick={() => topics && refresh(topics)}
                    disabled={refreshing || !topics}
                    aria-label={t("action.refresh")}
                    className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                    <RefreshCw
                        className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                    />
                    {t("action.refresh")}
                </button>
            </div>
            <p className="text-sm text-gray-600 font-serif mb-5 max-w-2xl">
                {t("feed.intro")}
            </p>

            {/* Topic chips */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <button
                    onClick={() => setActiveTopicId("all")}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        activeTopicId === "all"
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                >
                    {t("feed.all")}
                </button>
                {(topics ?? []).map((t) => (
                    <span key={t.id} className="inline-flex items-center">
                        <button
                            onClick={() => setActiveTopicId(t.id)}
                            className={`px-3 py-1 text-xs rounded-l-full border-y border-l transition-colors ${
                                activeTopicId === t.id
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                            {t.label}
                        </button>
                        <button
                            onClick={() => removeTopic(t.id)}
                            title={`Remove "${t.label}"`}
                            aria-label={`Remove ${t.label}`}
                            className={`px-1.5 py-1 text-xs rounded-r-full border-y border-r ${
                                activeTopicId === t.id
                                    ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
                                    : "bg-white text-gray-400 border-gray-300 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <button
                    onClick={() => setShowAdd((v) => !v)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-dashed border-gray-400 text-gray-600 hover:bg-gray-50"
                >
                    <Plus className="w-3 h-3" />
                    {t("feed.add_topic")}
                </button>
                {topics && topics.length === 0 && (
                    <button
                        onClick={resetToDefaults}
                        className="text-xs text-blue-600 hover:underline ml-2"
                    >
                        {t("feed.restore_defaults")}
                    </button>
                )}
            </div>

            {/* Add-topic form */}
            {showAdd && (
                <div className="border border-gray-200 rounded-lg p-4 mb-5 bg-gray-50 space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            {t("feed.topic_name")}
                        </label>
                        <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="e.g. EU AI Act"
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                {t("feed.subreddits")}
                            </label>
                            <textarea
                                value={newSubs}
                                onChange={(e) => setNewSubs(e.target.value)}
                                placeholder="r/law, r/legaladvice"
                                rows={2}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                {t("feed.keywords")}
                            </label>
                            <textarea
                                value={newKeywords}
                                onChange={(e) => setNewKeywords(e.target.value)}
                                placeholder="EU AI Act, AI Act enforcement"
                                rows={2}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => setShowAdd(false)}
                            className="px-3 py-1.5 text-xs rounded-md text-gray-600 hover:bg-gray-100"
                        >
                            {t("action.cancel")}
                        </button>
                        <button
                            onClick={addTopic}
                            disabled={!newLabel.trim()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                            <Save className="w-3 h-3" />
                            {t("feed.save_topic")}
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-xs text-red-700">
                    {error}
                </div>
            )}

            {/* Feed */}
            {loading ? (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <li key={i} className="p-3 flex gap-3">
                            <Skeleton className="w-16 h-16 rounded-md shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-1/3" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : filtered.length === 0 ? (
                <div className="text-sm text-gray-500 py-12 text-center">
                    {t("feed.empty")}
                </div>
            ) : (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
                    {filtered.map((item) => (
                        <li key={item.id}>
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex gap-3 p-3 hover:bg-gray-50 transition-colors"
                            >
                                {item.thumbnail ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={item.thumbnail}
                                        alt=""
                                        className="w-16 h-16 rounded-md object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                        <Rss className="w-5 h-5" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                                        <span className="font-medium text-amber-700">
                                            {item.topicLabel}
                                        </span>
                                        <span>·</span>
                                        <span>r/{item.subreddit}</span>
                                        <span>·</span>
                                        <span>{timeAgo(item.createdUtc)} ago</span>
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-900 leading-snug">
                                        {item.title}
                                    </h3>
                                    {item.excerpt && (
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2 font-serif">
                                            {item.excerpt}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                                        <span>↑ {item.score}</span>
                                        <span className="inline-flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" />
                                            {item.numComments}
                                        </span>
                                        <span>by u/{item.author}</span>
                                        {item.externalUrl && (
                                            <span className="inline-flex items-center gap-1 text-blue-600">
                                                <ArrowUpRight className="w-3 h-3" />
                                                link
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </a>
                        </li>
                    ))}
                </ul>
            )}

            <div className="mt-6 text-[11px] text-gray-400 text-center">
                {t("feed.footer")}
                {!isAuthenticated && ` · ${t("feed.footer.signin")}`}
            </div>
        </div>
    );
}
