"use client";

import * as React from "react";

/**
 * LouisMark — the official Louis logo.
 *
 * Design: a serif "L" framed by a hairline circle, with a subtle horizontal
 * crossbar suggesting both the foot of the L and a balance/scale (legal
 * symbolism, but understated). Warm gold accent on light backgrounds, warm
 * cream on dark.
 *
 * Two variants:
 *  - "mark" (default): just the icon
 *  - "wordmark": icon + "Louis" wordmark in serif
 */
export function LouisMark({
    size = 32,
    tone = "ink",
    style,
    className,
}: {
    size?: number;
    tone?: "ink" | "cream" | "gold";
    style?: React.CSSProperties;
    className?: string;
}) {
    const palette = TONES[tone];
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width={size}
            height={size}
            className={className}
            style={{ display: "block", ...style }}
            aria-label="Louis"
        >
            {/* Outer hairline frame */}
            <circle
                cx="32"
                cy="32"
                r="28"
                fill={palette.bg}
                stroke={palette.frame}
                strokeWidth="1.25"
            />
            {/* Subtle inner shadow / glow */}
            <circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke={palette.innerGlow}
                strokeWidth="0.5"
                opacity="0.6"
            />
            {/* Serif "L" — drawn as paths so it renders crisply at any size */}
            <g fill={palette.ink}>
                {/* Vertical stem */}
                <path d="M 24 18 L 24 44 L 25.6 44 L 25.6 18 Z" />
                {/* Top serifs */}
                <path d="M 21.4 18 L 21.4 19.2 L 28.2 19.2 L 28.2 18 Z" opacity="0.95" />
                {/* Bottom-left serif of stem */}
                <path d="M 21.4 42.8 L 21.4 44 L 25.6 44 L 25.6 42.8 Z" opacity="0.95" />
                {/* Horizontal arm (the foot of L, doubles as a discrete balance line) */}
                <path d="M 24 42.8 L 42.4 42.8 L 42.4 44 L 24 44 Z" />
                {/* Arm end serif (subtle) */}
                <path d="M 42.4 41.6 L 42.4 45.2 L 43.4 45.2 L 43.4 41.6 Z" opacity="0.9" />
                {/* Tiny stop on top right — reads as a serif foot of an unseen letter; balances composition */}
                <circle cx="42.4" cy="20" r="1.2" opacity="0.75" />
            </g>
        </svg>
    );
}

export function LouisWordmark({
    size = 28,
    tone = "ink",
    className,
}: {
    size?: number;
    tone?: "ink" | "cream" | "gold";
    className?: string;
}) {
    const palette = TONES[tone];
    return (
        <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
            <LouisMark size={size} tone={tone} />
            <span
                className="font-serif font-light tracking-tight leading-none"
                style={{ fontSize: size * 1.05, color: palette.ink }}
            >
                Louis
            </span>
        </span>
    );
}

const TONES = {
    ink: {
        bg: "#FBF8F2",      // warm cream
        frame: "#1F2937",   // slate-800
        innerGlow: "#C9A961", // muted gold
        ink: "#1F2937",
    },
    cream: {
        bg: "transparent",
        frame: "#FBF8F2",
        innerGlow: "#FBF8F2",
        ink: "#FBF8F2",
    },
    gold: {
        bg: "#FBF8F2",
        frame: "#C9A961",
        innerGlow: "#C9A961",
        ink: "#7C5B16",
    },
};
