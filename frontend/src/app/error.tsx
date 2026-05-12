"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("App error:", error);
    }, [error]);

    // Errors that look like "module factory is not available" / chunk-load
    // failures usually mean the browser is holding cached chunks from a
    // previous deploy. A hard reload usually fixes them in one click —
    // surface that explicitly rather than letting the user wonder why
    // clicking "Home" didn't help.
    const message = error?.message ?? "";
    const looksLikeStaleChunk =
        /module factory is not available|Failed to fetch dynamically imported module|ChunkLoadError/i.test(
            message,
        );

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <h1 className="text-3xl font-eb-garamond font-light text-gray-900 mb-3">
                    Something went wrong
                </h1>
                <p className="text-[0.9375rem] text-gray-500 leading-relaxed mb-6">
                    {looksLikeStaleChunk
                        ? "Looks like the app updated while this tab was open and an old chunk is still cached. A hard reload usually fixes it."
                        : "We encountered an unexpected error. This has been logged and our team will look into it."}
                </p>

                <div className="flex items-center justify-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            if (typeof window !== "undefined") {
                                window.location.reload();
                            } else {
                                reset();
                            }
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white bg-gray-900 hover:bg-gray-700 transition-colors"
                    >
                        Reload
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                        Home
                    </Link>
                </div>

                {error?.digest && (
                    <p className="mt-6 text-xs text-gray-400 font-mono">
                        ref: {error.digest}
                    </p>
                )}
            </div>
        </div>
    );
}
