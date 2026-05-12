/**
 * Animated feature mocks for the landing page.
 *
 * Each component renders a small, self-contained illustration of one
 * product surface using inline SVG + CSS keyframes. No external assets,
 * no heavy JS — they animate via `@keyframes` declared in globals.css
 * (prefix `louis-` to avoid collisions). All mocks share the same
 * aspect ratio and inner padding so the feature grid stays tidy.
 */

import * as React from "react";

type MockProps = { className?: string };

const FRAME =
    "relative w-full aspect-[4/3] rounded-xl border border-[#e7e2d6] bg-gradient-to-br from-white to-[#fbf8f2] overflow-hidden";

// ---------------------------------------------------------------------------
// Assistant — streaming chat with reasoning
// ---------------------------------------------------------------------------

export function AssistantMock({ className }: MockProps) {
    return (
        <div className={`${FRAME} ${className ?? ""}`}>
            <div className="absolute inset-3 flex flex-col gap-1.5 text-[8px]">
                <div className="self-end max-w-[80%] rounded-lg rounded-br-sm bg-gray-900 px-2 py-1.5 text-white">
                    Draft an MNDA between Globex and Acme.
                </div>
                <div className="max-w-[88%] rounded-lg rounded-bl-sm bg-white border border-gray-200 px-2 py-1.5 text-gray-700">
                    <div className="text-[7px] uppercase tracking-wider text-amber-700 mb-0.5 inline-flex items-center gap-1">
                        <span className="inline-block w-1 h-1 rounded-full bg-amber-500 louis-pulse" />
                        Reasoning
                    </div>
                    <div className="space-y-0.5 text-gray-500">
                        <div className="h-[3px] w-3/4 bg-gray-200 rounded louis-shimmer" />
                        <div className="h-[3px] w-5/6 bg-gray-200 rounded louis-shimmer [animation-delay:0.2s]" />
                        <div className="h-[3px] w-2/3 bg-gray-200 rounded louis-shimmer [animation-delay:0.4s]" />
                    </div>
                </div>
                <div className="max-w-[88%] rounded-lg rounded-bl-sm bg-white border border-gray-200 px-2 py-1.5 text-gray-800">
                    <span>This Mutual Non-Disclosure Agreement is entered into</span>
                    <span className="louis-caret">▎</span>
                </div>
            </div>
            <div className="absolute bottom-2 left-3 right-3 h-5 rounded-md border border-gray-200 bg-white flex items-center px-1.5 gap-1">
                <div className="flex-1 h-1.5 rounded bg-gray-100" />
                <div className="w-3 h-3 rounded bg-gray-900" />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Matters & Projects
// ---------------------------------------------------------------------------

export function MattersMock({ className }: MockProps) {
    return (
        <div className={`${FRAME} ${className ?? ""}`}>
            <div className="absolute inset-3 grid grid-cols-3 gap-1.5">
                {[
                    { name: "Globex × Acme M&A", dot: "bg-emerald-500", n: 14 },
                    { name: "Talabat — KSA entry", dot: "bg-amber-500", n: 7 },
                    { name: "Aramex employment", dot: "bg-sky-500", n: 23 },
                    { name: "Ahli FinTech licence", dot: "bg-rose-500", n: 5 },
                    { name: "Series B — VC pack", dot: "bg-violet-500", n: 11 },
                    { name: "Vendor MSA review", dot: "bg-emerald-500", n: 3 },
                ].map((m, i) => (
                    <div
                        key={m.name}
                        className="rounded-md border border-gray-200 bg-white p-1.5 louis-rise"
                        style={{ animationDelay: `${i * 0.08}s` }}
                    >
                        <div className="flex items-center gap-1 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                            <div className="h-1 w-3/4 bg-gray-200 rounded" />
                        </div>
                        <div className="text-[7px] text-gray-400">{m.n} docs</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Doc Workspace
// ---------------------------------------------------------------------------

export function DocWorkspaceMock({ className }: MockProps) {
    return (
        <div className={`${FRAME} ${className ?? ""}`}>
            <div className="absolute inset-3 flex gap-1.5">
                <div className="flex-1 rounded-md bg-white border border-gray-200 p-1.5 text-[7px] leading-relaxed font-serif">
                    <div className="font-semibold mb-0.5">Section 4. Confidentiality</div>
                    <div className="text-gray-700">
                        Each party agrees to{" "}
                        <span className="bg-red-100 text-red-700 line-through px-0.5 rounded-sm">
                            keep secret
                        </span>{" "}
                        <span className="bg-emerald-100 text-emerald-800 px-0.5 rounded-sm louis-pulse">
                            hold in strict confidence
                        </span>{" "}
                        all information disclosed.
                    </div>
                </div>
                <div className="w-1/3 rounded-md bg-[#fbf8f2] border border-amber-200/60 p-1.5 text-[6.5px] space-y-1">
                    <div className="font-medium text-amber-700 uppercase tracking-wider">
                        Suggestions
                    </div>
                    <div className="rounded bg-white border border-gray-200 p-1 louis-rise">
                        <div className="h-1 w-full bg-gray-200 rounded mb-1" />
                        <div className="flex gap-1">
                            <div className="px-1 rounded bg-emerald-600 text-white text-[6px]">
                                Accept
                            </div>
                            <div className="px-1 rounded bg-gray-100 text-gray-500 text-[6px]">
                                Reject
                            </div>
                        </div>
                    </div>
                    <div
                        className="rounded bg-white border border-gray-200 p-1 louis-rise"
                        style={{ animationDelay: "0.3s" }}
                    >
                        <div className="h-1 w-3/4 bg-gray-200 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Drafting Board
// ---------------------------------------------------------------------------

export function DraftingBoardMock({ className }: MockProps) {
    return (
        <div className={`${FRAME} ${className ?? ""}`}>
            <svg
                viewBox="0 0 240 180"
                className="absolute inset-0 w-full h-full"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="lane-bg" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#fbf8f2" />
                        <stop offset="1" stopColor="#ffffff" />
                    </linearGradient>
                </defs>
                <rect width="240" height="180" fill="url(#lane-bg)" />
                {/* Connecting lines */}
                <line x1="65" y1="55" x2="120" y2="55" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="65" y1="55" x2="120" y2="105" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="160" y1="105" x2="120" y2="55" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="120" y1="105" x2="170" y2="150" stroke="#d1d5db" strokeWidth="1" strokeDasharray="2 2" />
                {/* Nodes */}
                <g className="louis-rise">
                    <rect x="20" y="40" width="80" height="32" rx="6" fill="#ffffff" stroke="#10b981" strokeWidth="1.2" />
                    <circle cx="32" cy="56" r="3" fill="#10b981" />
                    <rect x="40" y="50" width="48" height="3" rx="1" fill="#e5e7eb" />
                    <rect x="40" y="58" width="36" height="2.5" rx="1" fill="#d1d5db" />
                </g>
                <g className="louis-rise" style={{ animationDelay: "0.15s" } as React.CSSProperties}>
                    <rect x="120" y="40" width="80" height="32" rx="6" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.2" />
                    <circle cx="132" cy="56" r="3" fill="#f59e0b" className="louis-pulse" />
                    <rect x="140" y="50" width="48" height="3" rx="1" fill="#e5e7eb" />
                    <rect x="140" y="58" width="32" height="2.5" rx="1" fill="#d1d5db" />
                </g>
                <g className="louis-rise" style={{ animationDelay: "0.3s" } as React.CSSProperties}>
                    <rect x="70" y="90" width="80" height="32" rx="6" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2" />
                    <circle cx="82" cy="106" r="3" fill="#94a3b8" />
                    <rect x="90" y="100" width="48" height="3" rx="1" fill="#e5e7eb" />
                    <rect x="90" y="108" width="40" height="2.5" rx="1" fill="#d1d5db" />
                </g>
                <g className="louis-rise" style={{ animationDelay: "0.45s" } as React.CSSProperties}>
                    <rect x="140" y="135" width="80" height="30" rx="6" fill="#ffffff" stroke="#6366f1" strokeWidth="1.2" strokeDasharray="3 2" />
                    <circle cx="152" cy="150" r="3" fill="#6366f1" />
                    <rect x="160" y="144" width="48" height="3" rx="1" fill="#e5e7eb" />
                    <rect x="160" y="152" width="28" height="2.5" rx="1" fill="#d1d5db" />
                </g>
            </svg>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Tabular Review
// ---------------------------------------------------------------------------

export function TabularReviewMock({ className }: MockProps) {
    const rows = [
        ["NDA_2024_Acme.pdf", "Mutual", "$5M cap"],
        ["MSA_Talabat.docx", "One-way", "Uncapped"],
        ["SOW_Ahli.pdf", "Mutual", "$1M cap"],
        ["License_WIPO.pdf", "One-way", "$10M cap"],
    ];
    return (
        <div className={`${FRAME} ${className ?? ""}`}>
            <div className="absolute inset-3 flex flex-col text-[7px]">
                <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-0.5 text-[6.5px] uppercase tracking-wider text-amber-700 font-medium pb-1 border-b border-gray-200">
                    <div>Document</div>
                    <div>Type</div>
                    <div>Liability</div>
                </div>
                {rows.map((row, i) => (
                    <div
                        key={i}
                        className="grid grid-cols-[1.4fr_0.8fr_0.8fr] gap-0.5 py-1 border-b border-gray-100 louis-rise"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className="text-gray-800 truncate">{row[0]}</div>
                        <div className="text-gray-600">{row[1]}</div>
                        <div>
                            <span className="px-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                                {row[2]}
                            </span>
                        </div>
                    </div>
                ))}
                <div className="mt-auto flex items-center gap-1 text-[6.5px] text-gray-400">
                    <span className="inline-block w-1 h-1 rounded-full bg-emerald-500 louis-pulse" />
                    <span>extracting · 32 / 128 docs</span>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Workflows & Routines
// ---------------------------------------------------------------------------

export function WorkflowsMock({ className }: MockProps) {
    return (
        <div className={`${FRAME} ${className ?? ""}`}>
            <div className="absolute inset-3 flex flex-col gap-1.5 text-[7px]">
                {[
                    { name: "Daily case digest — EUR-Lex", time: "09:00", on: true },
                    { name: "Weekly deadline reminder", time: "Mon 08:00", on: true },
                    { name: "New M&A regs — watch list", time: "Hourly", on: true },
                    { name: "Outdated clauses sweep", time: "1st of month", on: false },
                ].map((r, i) => (
                    <div
                        key={r.name}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1.5 flex items-center gap-2 louis-rise"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
                            <span className="w-1 h-1 rounded-full bg-amber-600 louis-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-gray-800 truncate">{r.name}</div>
                            <div className="text-gray-400 text-[6.5px]">{r.time}</div>
                        </div>
                        <div
                            className={`w-5 h-2.5 rounded-full relative ${r.on ? "bg-gray-900" : "bg-gray-200"}`}
                        >
                            <div
                                className={`absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-all ${r.on ? "left-2.5" : "left-0.5"}`}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Prompt Library
// ---------------------------------------------------------------------------

export function PromptLibraryMock({ className }: MockProps) {
    const cards = [
        { area: "Corporate", t: "Term sheet from heads of agreement" },
        { area: "Employment", t: "Saudi NDA + non-compete" },
        { area: "IP", t: "Trademark cease-and-desist" },
        { area: "Litigation", t: "Pleading skeleton — DIFC court" },
        { area: "FinTech", t: "PSD2 readiness checklist" },
        { area: "M&A", t: "DD findings memo" },
    ];
    return (
        <div className={`${FRAME} ${className ?? ""}`}>
            <div className="absolute inset-3 grid grid-cols-2 gap-1.5 text-[7px]">
                {cards.map((c, i) => (
                    <div
                        key={c.t}
                        className="rounded-md border border-gray-200 bg-white p-1.5 louis-rise"
                        style={{ animationDelay: `${i * 0.08}s` }}
                    >
                        <div className="text-[6px] uppercase tracking-wider text-amber-700 mb-0.5">
                            {c.area}
                        </div>
                        <div className="text-gray-800 leading-tight">{c.t}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Vault
// ---------------------------------------------------------------------------

export function VaultMock({ className }: MockProps) {
    return (
        <div className={`${FRAME} ${className ?? ""}`}>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                <svg viewBox="0 0 64 64" className="w-12 h-12">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#e7e2d6" strokeWidth="1" />
                    <circle
                        cx="32"
                        cy="32"
                        r="20"
                        fill="none"
                        stroke="#c9a961"
                        strokeWidth="1.5"
                        strokeDasharray="2 4"
                        className="louis-spin-slow"
                        style={{ transformOrigin: "32px 32px" } as React.CSSProperties}
                    />
                    <rect x="22" y="26" width="20" height="16" rx="2" fill="#fbf8f2" stroke="#1f2937" strokeWidth="1.2" />
                    <path d="M 26 26 V 22 A 6 6 0 0 1 38 22 V 26" fill="none" stroke="#1f2937" strokeWidth="1.2" />
                    <circle cx="32" cy="34" r="1.6" fill="#c9a961" />
                    <line x1="32" y1="34" x2="32" y2="38" stroke="#c9a961" strokeWidth="1.2" />
                </svg>
                <div className="text-[7.5px] text-gray-600 font-medium">AES-256 · privilege-aware</div>
                <div className="grid grid-cols-3 gap-1 text-[6.5px] text-gray-500 mt-1">
                    {["encrypted at rest", "per-client isolation", "audit log"].map((t) => (
                        <div key={t} className="rounded border border-gray-200 bg-white px-1 py-0.5 text-center">
                            {t}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Newsfeed
// ---------------------------------------------------------------------------

export function NewsfeedMock({ className }: MockProps) {
    const items = [
        { sub: "r/BigLaw", t: "How firms are pricing AI hours" },
        { sub: "r/LegalAdvice", t: "DIFC vs onshore — vendor MSA" },
        { sub: "r/LegalTech", t: "Spellbook v3 vs Harvey on M&A" },
        { sub: "r/Law", t: "EU AI Act — practical compliance" },
    ];
    return (
        <div className={`${FRAME} ${className ?? ""}`}>
            <div className="absolute inset-3 flex flex-col gap-1 text-[7px]">
                {items.map((n, i) => (
                    <div
                        key={n.t}
                        className="flex items-start gap-1.5 p-1 rounded border border-gray-200 bg-white louis-rise"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className="w-4 h-4 rounded bg-amber-100 border border-amber-200 flex items-center justify-center text-[6px] text-amber-700 font-medium shrink-0">
                            r/
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-gray-800 truncate font-medium">{n.t}</div>
                            <div className="text-gray-400 text-[6px]">{n.sub} · 4h</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Hero — composite mock of the workbench
// ---------------------------------------------------------------------------

export function HeroMock({ className }: MockProps) {
    return (
        <div
            className={`relative w-full aspect-[16/11] rounded-2xl border border-[#e7e2d6] bg-gradient-to-br from-[#fbf8f2] via-white to-[#f3ead4] overflow-hidden shadow-[0_24px_60px_-20px_rgba(31,41,55,0.25)] ${className ?? ""}`}
        >
            {/* Top chrome */}
            <div className="absolute inset-x-0 top-0 h-7 border-b border-[#e7e2d6] bg-white/70 backdrop-blur flex items-center px-3 gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-300" />
                <span className="w-2 h-2 rounded-full bg-amber-300" />
                <span className="w-2 h-2 rounded-full bg-emerald-300" />
                <div className="ml-3 text-[10px] text-gray-500 font-mono">legal.dashable.dev / assistant</div>
            </div>

            <div className="absolute inset-x-0 top-7 bottom-0 flex">
                {/* Sidebar */}
                <div className="w-[18%] border-r border-[#e7e2d6] bg-[#fbf8f2]/70 backdrop-blur-sm py-2 px-2 flex flex-col gap-1 text-[8px]">
                    <div className="text-[7px] uppercase tracking-wider text-gray-400 mb-0.5 px-1">
                        Favorites
                    </div>
                    {["Home", "Assistant", "Projects", "Drafting Board"].map((n, i) => (
                        <div
                            key={n}
                            className={`px-1.5 py-1 rounded ${i === 1 ? "bg-gray-900 text-white" : "text-gray-700"}`}
                        >
                            {n}
                        </div>
                    ))}
                    <div className="text-[7px] uppercase tracking-wider text-gray-400 mt-2 mb-0.5 px-1">
                        Work
                    </div>
                    {["Tabular Review", "Doc Workspace", "Routines", "Vault", "Newsfeed"].map((n) => (
                        <div key={n} className="px-1.5 py-1 rounded text-gray-600">
                            {n}
                        </div>
                    ))}
                </div>

                {/* Chat pane */}
                <div className="flex-1 p-3 flex flex-col gap-2 text-[9px]">
                    <div className="self-end max-w-[70%] rounded-lg rounded-br-sm bg-gray-900 text-white px-2.5 py-1.5">
                        Review the Globex SPA for hidden indemnity caps + flag any unusual MAC carve-outs.
                    </div>

                    <div className="self-start max-w-[85%] rounded-lg rounded-bl-sm bg-white border border-gray-200 px-2.5 py-1.5 text-gray-800 shadow-sm">
                        <div className="text-[7.5px] uppercase tracking-wider text-amber-700 mb-1 inline-flex items-center gap-1">
                            <span className="inline-block w-1 h-1 rounded-full bg-amber-500 louis-pulse" />
                            Reasoning · 12s
                        </div>
                        <div className="space-y-0.5 mb-1">
                            <div className="h-[3px] w-11/12 bg-gray-200 rounded louis-shimmer" />
                            <div className="h-[3px] w-5/6 bg-gray-200 rounded louis-shimmer [animation-delay:0.2s]" />
                            <div className="h-[3px] w-3/4 bg-gray-200 rounded louis-shimmer [animation-delay:0.4s]" />
                        </div>
                        <div>
                            Three indemnity caps in §9.4 — the survivor cap drops from $5M to{" "}
                            <span className="bg-amber-100 text-amber-900 rounded-sm px-0.5">
                                $1.2M
                            </span>{" "}
                            after 18 months, which conflicts with the unconditional fundamental-reps carve-out in §9.6.
                            <span className="louis-caret">▎</span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap gap-1">
                            <span className="px-1 py-0.5 rounded text-[6.5px] bg-amber-50 text-amber-800 border border-amber-200">
                                m&a.indemnity-cap.audit
                            </span>
                            <span className="px-1 py-0.5 rounded text-[6.5px] bg-amber-50 text-amber-800 border border-amber-200">
                                review.cross-reference
                            </span>
                            <span className="px-1 py-0.5 rounded text-[6.5px] bg-amber-50 text-amber-800 border border-amber-200">
                                jurisdiction.uae
                            </span>
                        </div>
                    </div>

                    <div className="mt-auto rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 flex items-center gap-2">
                        <div className="flex-1 h-2.5 rounded bg-gray-100" />
                        <div className="w-5 h-5 rounded-md bg-gray-900 text-white text-[7px] flex items-center justify-center">
                            ↵
                        </div>
                    </div>
                </div>

                {/* Right rail — citations */}
                <div className="w-[26%] border-l border-[#e7e2d6] bg-white/70 backdrop-blur-sm p-2 flex flex-col gap-1.5 text-[8px]">
                    <div className="text-[7px] uppercase tracking-wider text-gray-400">
                        Cited from
                    </div>
                    {[
                        { name: "Globex_SPA_v7.pdf", page: "p. 42", c: "bg-amber-500" },
                        { name: "Globex_SPA_v7.pdf", page: "p. 51", c: "bg-amber-500" },
                        { name: "DD_Memo_2026Q1.docx", page: "p. 9", c: "bg-emerald-500" },
                    ].map((c, i) => (
                        <div
                            key={i}
                            className="rounded border border-gray-200 bg-white p-1.5 louis-rise"
                            style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                        >
                            <div className="flex items-center gap-1 mb-0.5">
                                <span className={`w-1 h-1 rounded-full ${c.c}`} />
                                <div className="text-[6.5px] text-gray-500">{c.page}</div>
                            </div>
                            <div className="text-gray-800 truncate">{c.name}</div>
                            <div className="text-[6.5px] text-gray-500 mt-0.5 italic">
                                "Survivor cap shall …"
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
