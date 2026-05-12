"use client";

import React from "react";
import { LouisMark } from "@/components/brand/louis-mark";

/**
 * LouisIcon — the assistant avatar used inside the chat surface.
 *
 * This used to be the rotating-blades Mike icon (carried over from the fork).
 * It now wraps the actual Louis brand mark (serif "L" in a hairline circle).
 *
 * State variants:
 *  - default (no flag): the standard ink-on-cream mark
 *  - spin=true: gentle pulse (used while a turn is streaming)
 *  - done=true: green palette (used as a brief success cue)
 *  - error=true: red palette (used when a turn errored)
 *  - louis prop: kept for source compatibility; ignored.
 */
export function LouisIcon({
    spin = false,
    done = false,
    error = false,
    louis = false,
    size = 24,
    style,
}: {
    spin?: boolean;
    done?: boolean;
    error?: boolean;
    louis?: boolean;
    size?: number;
    style?: React.CSSProperties;
}) {
    void louis;

    const tone: "ink" | "gold" | "cream" = error
        ? "gold"
        : done
          ? "gold"
          : "ink";

    return (
        <span
            className={`shrink-0 inline-flex items-center justify-center ${
                spin ? "animate-pulse" : ""
            }`}
            style={style}
            aria-label="Louis"
            role="img"
        >
            <LouisMark
                size={size}
                tone={tone}
                style={
                    error
                        ? { filter: "hue-rotate(310deg) saturate(2.5)" }
                        : done
                          ? { filter: "hue-rotate(45deg) saturate(1.8)" }
                          : undefined
                }
            />
        </span>
    );
}
