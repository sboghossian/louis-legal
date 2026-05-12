"use client";

/**
 * /help redirects to /academy — the merged docs + help surface.
 * Kept as an alias so old URLs don't 404.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HelpRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/academy");
    }, [router]);
    return (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Opening Academy…
        </div>
    );
}
