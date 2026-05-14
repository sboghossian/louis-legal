import type { MetadataRoute } from "next";

/**
 * Dynamic sitemap — served by Next at `/sitemap.xml`.
 *
 * Replaces the old hand-maintained `public/sitemap.xml` (which had only 9
 * of the public routes and went stale on every page add). Keep this list
 * in sync with `PUBLIC_PATHS` in `(pages)/layout.tsx` and the `Disallow`
 * list in `robots.ts` — anything indexable belongs here, anything behind
 * auth does not.
 */

const SITE_URL = "https://legal.dashable.dev";

type Entry = {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
};

// Public, crawlable surfaces only. App routes (/assistant, /projects,
// /integrations, /legal-flows, …) are intentionally absent — they're
// auth-gated and `Disallow`-ed. `/docs` and `/help` are 308 redirects to
// `/academy` (see next.config.ts), so they're not listed here either.
const ROUTES: Entry[] = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/academy", changeFrequency: "weekly", priority: 0.8 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/plugins", changeFrequency: "monthly", priority: 0.7 },
    { path: "/signup", changeFrequency: "monthly", priority: 0.6 },
    { path: "/transparency", changeFrequency: "monthly", priority: 0.5 },
    { path: "/login", changeFrequency: "yearly", priority: 0.4 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();
    return ROUTES.map(({ path, changeFrequency, priority }) => ({
        url: `${SITE_URL}${path}`,
        lastModified,
        changeFrequency,
        priority,
    }));
}
