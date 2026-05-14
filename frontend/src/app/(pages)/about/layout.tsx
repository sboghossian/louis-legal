import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// `about/page.tsx` is a client component and can't export metadata itself;
// this thin server layout supplies it.
export const metadata: Metadata = pageMetadata({
    title: "About",
    description:
        "Louis is open-source legal AI — forked from Mike, rebuilt around HAQQ's comfort-UI vision. MIT licensed, free forever, sovereign by design.",
    path: "/about",
});

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
