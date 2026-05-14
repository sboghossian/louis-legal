import type { Metadata } from "next";

/**
 * Build per-page metadata for a public marketing route.
 *
 * Most public pages are `"use client"` components, which can't export
 * `metadata` themselves — so each gets a thin server `layout.tsx` that
 * calls this helper. Centralising it keeps the canonical URL and the
 * OG/Twitter title+description in sync, and keeps every page layout a
 * three-line file.
 *
 * `title` is passed through the root layout's "%s · Louis" template for
 * the `<title>` tag; OG/Twitter get the already-expanded `"<title> · Louis"`
 * because those fields don't inherit the template.
 */
export function pageMetadata({
    title,
    description,
    path,
}: {
    title: string;
    description: string;
    path: string;
}): Metadata {
    const fullTitle = `${title} · Louis`;
    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: {
            type: "website",
            url: path,
            siteName: "Louis",
            title: fullTitle,
            description,
        },
        twitter: {
            card: "summary_large_image",
            title: fullTitle,
            description,
        },
    };
}
