"use client";

/**
 * /help is the friendly entry point that routes to /docs. /docs has the
 * categorised, searchable knowledge base; /help is the URL someone types
 * when they're stuck.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HelpRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/docs");
    }, [router]);
    return (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Opening Help…
        </div>
    );
}
