/**
 * Skeleton — visual placeholder while content is loading.
 *
 * Replaces the "loading…" text scattered across pages with a calmer,
 * shape-aware shimmer that reserves layout space so the page doesn't
 * jolt on content arrival.
 *
 * Usage:
 *   <Skeleton className="h-4 w-40" />
 *   <SkeletonRows count={5} rowClassName="h-6 w-full" />
 */

"use client";

import { cn } from "@/lib/utils";

export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                "animate-pulse rounded-md bg-muted",
                className,
            )}
            {...props}
        />
    );
}

export function SkeletonRows({
    count = 4,
    rowClassName = "h-4 w-full",
    gapClassName = "space-y-2",
}: {
    count?: number;
    rowClassName?: string;
    gapClassName?: string;
}) {
    return (
        <div className={gapClassName}>
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className={rowClassName} />
            ))}
        </div>
    );
}

/**
 * SkeletonPage — full-page placeholder we drop in while a page's data
 * loads. Mirrors the workbench top-bar + content shape so the layout
 * doesn't shift when the real content paints.
 */
export function SkeletonPage({ rows = 6 }: { rows?: number }) {
    return (
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-3 w-2/3 max-w-md" />
            </div>
            <Skeleton className="h-10 w-full max-w-md" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                ))}
            </div>
        </div>
    );
}
