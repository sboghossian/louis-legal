/**
 * Newsfeed — Reddit-backed topic feed for legal industry chatter.
 *
 * No auth required to read Reddit's public JSON, but they enforce a
 * User-Agent and ~60 req/min/IP. We coalesce repeated requests with an
 * in-process 5-minute cache and limit per-topic fan-out to 4 subreddits +
 * 4 keyword searches.
 *
 * Topics are owned by the user. The route accepts a list (so the frontend
 * can render the user's saved topics + ad-hoc filters) and merges results
 * across all of them, returning newest-first.
 */

import { Router } from "express";

export const feedRouter = Router();

const USER_AGENT =
    process.env.REDDIT_USER_AGENT ??
    "louis-legal/0.1 (+https://legal.dashable.dev) by louis-bot";

type Topic = {
    id: string;
    label: string;
    subreddits?: string[];
    keywords?: string[];
};

export type FeedItem = {
    id: string; // reddit fullname (t3_xxxxx) — globally unique
    topicId: string;
    topicLabel: string;
    title: string;
    author: string;
    subreddit: string;
    url: string; // permalink to the reddit thread
    externalUrl: string | null; // the post's link, if it's a link post
    createdUtc: number; // unix seconds
    score: number;
    numComments: number;
    thumbnail: string | null;
    excerpt: string | null;
    over18: boolean;
};

// The user-listed defaults — every account starts here.
export const DEFAULT_TOPICS: Topic[] = [
    {
        id: "legal",
        label: "Legal",
        subreddits: ["law", "lawschool"],
    },
    {
        id: "legal-ai",
        label: "Legal AI",
        keywords: ["legal AI", "AI lawyer", "LLM law", "AI contract review"],
    },
    {
        id: "big-law",
        label: "Big Law",
        subreddits: ["biglaw"],
    },
    {
        id: "legal-advice",
        label: "Legal Advice",
        subreddits: ["legaladvice", "legaladviceofftopic"],
    },
    {
        id: "legal-tech",
        label: "Legal Tech",
        subreddits: ["legaltech", "legaltechnology"],
    },
    {
        id: "anthropic-claude-legal",
        label: "Anthropic Claude × Legal",
        keywords: ["Claude legal", "Anthropic legal", "Claude lawyer"],
    },
    {
        id: "open-source-legal",
        label: "Open source legal",
        keywords: ["open source legal", "open source law"],
    },
    {
        id: "microsoft-legal",
        label: "Microsoft × Legal",
        keywords: ["Microsoft legal", "Copilot legal", "Word legal AI"],
    },
    {
        id: "legal-products",
        label: "Legal products",
        keywords: [
            "Harvey AI",
            "Clio software",
            "Spellbook contract",
            "Monitz legal",
            "Legora",
            "CoCounsel",
        ],
    },
];

type CacheEntry = { items: FeedItem[]; fetchedAt: number };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Cap per-topic fan-out so a user can't accidentally hammer reddit.
const MAX_SUBREDDITS_PER_TOPIC = 4;
const MAX_KEYWORDS_PER_TOPIC = 4;
const PER_QUERY_LIMIT = 12;

type RedditPost = {
    name: string;
    title: string;
    author: string;
    subreddit: string;
    permalink: string;
    url: string;
    created_utc: number;
    score: number;
    num_comments: number;
    thumbnail: string;
    selftext: string;
    over_18: boolean;
    is_self: boolean;
};

type RedditListing = {
    data: {
        children: { kind: string; data: RedditPost }[];
    };
};

function normalize(raw: RedditPost, topic: Topic): FeedItem {
    const thumbnail =
        raw.thumbnail &&
        raw.thumbnail !== "self" &&
        raw.thumbnail !== "default" &&
        raw.thumbnail !== "nsfw" &&
        raw.thumbnail.startsWith("http")
            ? raw.thumbnail
            : null;
    return {
        id: raw.name,
        topicId: topic.id,
        topicLabel: topic.label,
        title: raw.title,
        author: raw.author,
        subreddit: raw.subreddit,
        url: `https://www.reddit.com${raw.permalink}`,
        externalUrl: raw.is_self ? null : raw.url,
        createdUtc: raw.created_utc,
        score: raw.score,
        numComments: raw.num_comments,
        thumbnail,
        excerpt: raw.selftext ? raw.selftext.slice(0, 240) : null,
        over18: raw.over_18,
    };
}

async function fetchJson(url: string): Promise<RedditListing | null> {
    try {
        const r = await fetch(url, {
            headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        });
        if (!r.ok) {
            console.warn("[feed] reddit returned", r.status, "for", url);
            return null;
        }
        return (await r.json()) as RedditListing;
    } catch (err) {
        console.warn("[feed] fetch failed", url, err);
        return null;
    }
}

async function fetchTopicItems(topic: Topic): Promise<FeedItem[]> {
    const key = `${topic.id}::${(topic.subreddits ?? []).join(",")}::${(topic.keywords ?? []).join(",")}`;
    const cached = CACHE.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.items;
    }

    const subreddits = (topic.subreddits ?? []).slice(0, MAX_SUBREDDITS_PER_TOPIC);
    const keywords = (topic.keywords ?? []).slice(0, MAX_KEYWORDS_PER_TOPIC);

    const urls: string[] = [];
    for (const sub of subreddits) {
        const safe = sub.replace(/[^a-zA-Z0-9_]/g, "");
        if (safe)
            urls.push(
                `https://www.reddit.com/r/${safe}/new.json?limit=${PER_QUERY_LIMIT}`,
            );
    }
    for (const kw of keywords) {
        const q = encodeURIComponent(kw);
        urls.push(
            `https://www.reddit.com/search.json?q=${q}&sort=new&limit=${PER_QUERY_LIMIT}`,
        );
    }

    const listings = await Promise.all(urls.map(fetchJson));
    const items: FeedItem[] = [];
    const seen = new Set<string>();
    for (const listing of listings) {
        if (!listing?.data?.children) continue;
        for (const child of listing.data.children) {
            if (child.kind !== "t3") continue;
            const raw = child.data;
            if (!raw || !raw.name || seen.has(raw.name)) continue;
            seen.add(raw.name);
            items.push(normalize(raw, topic));
        }
    }
    items.sort((a, b) => b.createdUtc - a.createdUtc);

    CACHE.set(key, { items, fetchedAt: Date.now() });
    return items;
}

function isStringArray(value: unknown): value is string[] {
    return (
        Array.isArray(value) &&
        value.every((v) => typeof v === "string" && v.trim().length > 0)
    );
}

function parseTopics(raw: unknown): Topic[] | null {
    if (!Array.isArray(raw)) return null;
    const out: Topic[] = [];
    for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const t = item as Record<string, unknown>;
        if (typeof t.id !== "string" || typeof t.label !== "string") continue;
        if (
            (t.subreddits !== undefined && !isStringArray(t.subreddits)) ||
            (t.keywords !== undefined && !isStringArray(t.keywords))
        ) {
            continue;
        }
        out.push({
            id: t.id,
            label: t.label,
            subreddits: (t.subreddits as string[] | undefined) ?? [],
            keywords: (t.keywords as string[] | undefined) ?? [],
        });
    }
    return out;
}

// GET /api/feed/defaults — returns the default topic list so the frontend
// can seed a new user's saved feeds.
feedRouter.get("/defaults", (_req, res) => {
    res.json({ topics: DEFAULT_TOPICS });
});

// POST /api/feed — body: { topics: Topic[] }
// Public (no auth required) so an anonymous browser can see the legal
// newsfeed. Authenticated users hit the same route with their saved
// topics; the route doesn't read from user_profiles itself (the frontend
// passes them in).
feedRouter.post("/", async (req, res) => {
    const topics = parseTopics(req.body?.topics) ?? DEFAULT_TOPICS;
    if (topics.length === 0) {
        return void res.json({ items: [], topics: [] });
    }
    const lists = await Promise.all(
        topics.slice(0, 20).map((t) => fetchTopicItems(t)),
    );
    const merged: FeedItem[] = [];
    const seenIds = new Set<string>();
    for (const list of lists) {
        for (const item of list) {
            if (seenIds.has(item.id)) continue;
            seenIds.add(item.id);
            merged.push(item);
        }
    }
    merged.sort((a, b) => b.createdUtc - a.createdUtc);

    res.json({
        topics: topics.map((t) => ({
            id: t.id,
            label: t.label,
            subreddits: t.subreddits ?? [],
            keywords: t.keywords ?? [],
        })),
        items: merged.slice(0, 200),
        fetchedAt: Date.now(),
    });
});
