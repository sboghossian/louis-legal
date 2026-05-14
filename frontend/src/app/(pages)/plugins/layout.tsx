import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// `plugins/page.tsx` is a client component and can't export metadata itself;
// this thin server layout supplies it.
export const metadata: Metadata = pageMetadata({
    title: "Plugins & skills",
    description:
        "Extend Louis with plugins and skills — 983 skills across 30+ jurisdictions, every one MIT-licensed plain markdown you can read, audit, and fork.",
    path: "/plugins",
});

export default function PluginsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
