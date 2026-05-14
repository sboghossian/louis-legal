import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// `academy/page.tsx` is a client component and can't export metadata itself;
// this thin server layout supplies it. /docs and /help 308-redirect here.
export const metadata: Metadata = pageMetadata({
    title: "Academy",
    description:
        "The Louis cookbook: hands-on recipes for legal-AI workflows — drafting, tabular review, agentic flows, citations — built on the open platform.",
    path: "/academy",
});

export default function AcademyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
