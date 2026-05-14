import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// `signup/page.tsx` is a client component and can't export metadata itself;
// this thin server layout supplies it.
export const metadata: Metadata = pageMetadata({
    title: "Sign up — free forever",
    description:
        "Create your free Louis account — open-source legal AI, free forever. Bring your own API key, MIT licensed, self-hostable.",
    path: "/signup",
});

export default function SignupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
