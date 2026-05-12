"use client";

import { RotateCcw } from "lucide-react";
import {
    DENSITIES,
    FONTS,
    THEMES,
    useAppearance,
} from "@/contexts/AppearanceContext";

export function AppearanceTab() {
    const { appearance, setTheme, setFont, setDensity, setFontScale, reset } =
        useAppearance();

    return (
        <div className="max-w-2xl space-y-8">
            <p className="text-sm text-gray-600">
                Customize how Louis looks across every screen. Settings sync to
                your account, and are remembered per browser when you're signed
                out.
            </p>

            <section>
                <h3 className="text-sm font-semibold mb-1">Theme</h3>
                <p className="text-xs text-gray-500 mb-3">
                    The base palette for the workbench surface.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {THEMES.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTheme(t.id)}
                            aria-pressed={appearance.theme === t.id}
                            className={`flex flex-col items-start gap-2 p-2 rounded-lg border text-left transition-colors ${
                                appearance.theme === t.id
                                    ? "border-gray-900 ring-1 ring-gray-900"
                                    : "border-gray-200 hover:border-gray-400"
                            }`}
                        >
                            <div
                                className="h-12 w-full rounded border border-gray-200"
                                style={{ background: t.preview }}
                            />
                            <span className="text-xs font-medium">
                                {t.label}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <h3 className="text-sm font-semibold mb-1">Font</h3>
                <p className="text-xs text-gray-500 mb-3">
                    Applies everywhere the interface reads from{" "}
                    <code className="px-1 rounded bg-gray-100">
                        --font-sans
                    </code>{" "}
                    (which is most of the app).
                </p>
                <div className="space-y-2">
                    {FONTS.map((f) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setFont(f.id)}
                            aria-pressed={appearance.font === f.id}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                                appearance.font === f.id
                                    ? "border-gray-900 ring-1 ring-gray-900"
                                    : "border-gray-200 hover:border-gray-400"
                            }`}
                        >
                            <span className="text-sm font-medium">
                                {f.label}
                            </span>
                            <span
                                className="text-base text-gray-700"
                                style={{ fontFamily: f.sample }}
                            >
                                The quick brown fox
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <h3 className="text-sm font-semibold mb-1">Density</h3>
                <p className="text-xs text-gray-500 mb-3">
                    Tightens or relaxes vertical spacing on flexible
                    containers.
                </p>
                <div className="flex gap-2">
                    {DENSITIES.map((d) => (
                        <button
                            key={d.id}
                            type="button"
                            onClick={() => setDensity(d.id)}
                            aria-pressed={appearance.density === d.id}
                            className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                                appearance.density === d.id
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <h3 className="text-sm font-semibold mb-1">Text size</h3>
                <p className="text-xs text-gray-500 mb-3">
                    Scales the base font size from 85% to 125%. Affects every
                    surface.
                </p>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={0.85}
                        max={1.25}
                        step={0.05}
                        value={appearance.fontScale}
                        onChange={(e) =>
                            setFontScale(parseFloat(e.target.value))
                        }
                        className="flex-1"
                    />
                    <span className="text-sm tabular-nums w-12 text-right">
                        {Math.round(appearance.fontScale * 100)}%
                    </span>
                </div>
            </section>

            <section className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold mb-1">Preview</h3>
                <p className="text-xs text-gray-500 mb-3">
                    Updates as you change settings above.
                </p>
                <div
                    className="rounded-md p-4 border"
                    style={{
                        background: "var(--background)",
                        color: "var(--foreground)",
                        borderColor: "var(--border)",
                    }}
                >
                    <div className="text-base font-medium mb-1">
                        Louis — your legal AI workbench
                    </div>
                    <div className="text-sm opacity-80">
                        "Draft a mutual NDA between [parties] for [purpose]…"
                    </div>
                </div>
            </section>

            <div>
                <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to defaults
                </button>
            </div>
        </div>
    );
}
