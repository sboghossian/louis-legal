import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// `login/page.tsx` is a client component and can't export metadata itself;
// this thin server layout supplies it.
export const metadata: Metadata = pageMetadata({
    title: "Sign in",
    description:
        "Sign in to Louis — the open-source developer platform for legal infrastructure. Your API key, your data, your stack.",
    path: "/login",
});

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
