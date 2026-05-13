"use client";

import { RotateCcw } from "lucide-react";
import {
    DENSITIES,
    FONTS,
    THEMES,
    useAppearance,
} from "@/contexts/AppearanceContext";
import { LOCALES, useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/i18n/dictionaries";

export function AppearanceTab() {
    const { appearance, setTheme, setFont, setDensity, setFontScale, reset } =
        useAppearance();
    const { locale, setLocale, t } = useLocale();

    return (
        <div className="max-w-2xl space-y-8">
            <p className="text-sm text-muted-foreground">
                Customize how Louis looks across every screen. Settings sync to
                your account, and are remembered per browser when you're signed
                out.
            </p>

            <section>
                <h3 className="text-sm font-semibold mb-1">
                    {t("appearance.language")}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                    {t("appearance.language.description")}
                </p>
                <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value as Locale)}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-amber-200 w-full sm:w-auto"
                >
                    {LOCALES.map((l) => (
                        <option key={l.code} value={l.code}>
                            {l.native}
                            {l.label !== l.native ? ` — ${l.label}` : ""}
                        </option>
                    ))}
                </select>
            </section>

            <section>
                <h3 className="text-sm font-semibold mb-1">
                    {t("appearance.theme")}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
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
                                    ? "border-foreground ring-1 ring-gray-900"
                                    : "border-border hover:border-border"
                            }`}
                        >
                            <div
                                className="h-12 w-full rounded border border-border"
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
                <h3 className="text-sm font-semibold mb-1">
                    {t("appearance.font")}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                    Applies everywhere the interface reads from{" "}
                    <code className="px-1 rounded bg-muted">
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
                                    ? "border-foreground ring-1 ring-gray-900"
                                    : "border-border hover:border-border"
                            }`}
                        >
                            <span className="text-sm font-medium">
                                {f.label}
                            </span>
                            <span
                                className="text-base text-foreground/80"
                                style={{ fontFamily: f.sample }}
                            >
                                The quick brown fox
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <h3 className="text-sm font-semibold mb-1">
                    {t("appearance.density")}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
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
                                    ? "bg-foreground text-white border-foreground"
                                    : "bg-card text-foreground/80 border-border hover:bg-muted"
                            }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            </section>

            <section>
                <h3 className="text-sm font-semibold mb-1">
                    {t("appearance.text_size")}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
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

            <section className="border border-border rounded-lg p-4 bg-muted">
                <h3 className="text-sm font-semibold mb-1">
                    {t("appearance.preview")}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground border border-border hover:border-border"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t("appearance.reset")}
                </button>
            </div>
        </div>
    );
}
