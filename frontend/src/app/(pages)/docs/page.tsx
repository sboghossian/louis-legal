"use client";

/**
 * /docs redirects to /academy — the merged docs + help surface.
 * Kept as an alias so old URLs (and the (pages)/layout.tsx onboarding-
 * exempt list) don't break.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DocsRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/academy");
    }, [router]);
    return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Opening Academy…
        </div>
    );
}
