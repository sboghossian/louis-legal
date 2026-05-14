import type { MetadataRoute } from "next";

/**
 * Robots policy — served by Next at `/robots.txt`.
 *
 * Replaces the old static `public/robots.txt`. The `disallow` list covers
 * every authenticated app surface so crawlers spend their budget on the
 * public marketing/learning pages (which `sitemap.ts` enumerates) instead
 * of login-walled routes that just bounce them to `/login`.
 */

const SITE_URL = "https://legal.dashable.dev";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/api/",
                "/assistant",
                "/home",
                "/inbox",
                "/all-chats",
                "/projects",
                "/matters",
                "/doc-workspace",
                "/drafting-board",
                "/tabular-reviews",
                "/workflows",
                "/integrations",
                "/legal-flows",
                "/routines",
                "/skills",
                "/clauses",
                "/citations",
                "/risk",
                "/team",
                "/calculators",
                "/prompt-library",
                "/vault",
                "/efirm",
                "/customize",
                "/account",
                "/settings",
                "/referral",
                "/onboarding",
                "/auth",
                "/forgot-password",
                "/reset-password",
            ],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
