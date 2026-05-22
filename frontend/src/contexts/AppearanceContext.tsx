"use client";

/**
 * Appearance customization — theme, font, density, font scale.
 *
 * Storage strategy:
 *   1. Read localStorage synchronously before first paint via the inline
 *      script in <head> (see _AppearanceBoot in layout.tsx). That avoids a
 *      flash of unstyled appearance.
 *   2. When the user is signed in, sync from server profile and overwrite
 *      localStorage with the server's view. Any local change is mirrored
 *      back to /user/profile.
 *   3. When the user is signed out, localStorage is the source of truth.
 *
 * The context writes `data-theme`, `data-font`, `data-density` attributes on
 * <html> and sets `--font-scale`. globals.css picks them up.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    updateUserProfile,
    type AppearanceDensity,
    type AppearanceFont,
    type AppearanceSettings,
    type AppearanceTheme,
} from "@/app/lib/louisApi";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const STORAGE_KEY = "louis.appearance";

export const APPEARANCE_DEFAULTS = {
    theme: "cream" as AppearanceTheme,
    font: "serif-garamond" as AppearanceFont,
    density: "comfortable" as AppearanceDensity,
    fontScale: 1.0,
} as const;

export const THEMES: { id: AppearanceTheme; label: string; preview: string }[] =
    [
        { id: "cream", label: "Cream", preview: "#fbf8f2" },
        { id: "paper", label: "Paper", preview: "#faf7f0" },
        { id: "slate", label: "Slate", preview: "#f5f7fb" },
        { id: "light", label: "Clean light", preview: "#ffffff" },
        { id: "dark", label: "Dark", preview: "#1c1c1c" },
        { id: "helm", label: "Helm", preview: "#0b0d13" },
    ];

export const FONTS: { id: AppearanceFont; label: string; sample: string }[] = [
    { id: "serif-garamond", label: "EB Garamond (serif)", sample: "serif" },
    { id: "sans-inter", label: "Inter (sans)", sample: "sans-serif" },
    {
        id: "serif-merriweather",
        label: "System serif",
        sample: "Georgia, serif",
    },
    { id: "mono-jetbrains", label: "Monospace", sample: "monospace" },
    { id: "system", label: "System sans", sample: "system-ui" },
];

export const DENSITIES: { id: AppearanceDensity; label: string }[] = [
    { id: "comfortable", label: "Comfortable" },
    { id: "compact", label: "Compact" },
];

// `language` is intentionally not part of the AppearanceContext domain —
// it's owned by LocaleContext. We narrow the type so adding optional
// fields like `language` to AppearanceSettings doesn't break the
// strict-required tuple of theme/font/density/fontScale here.
type AppearanceCore = Required<
    Pick<AppearanceSettings, "theme" | "font" | "density" | "fontScale">
>;

function applyToDom(value: AppearanceCore) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", value.theme);
    root.setAttribute("data-font", value.font);
    root.setAttribute("data-density", value.density);
    root.style.setProperty("--font-scale", String(value.fontScale));
}

function readLocal(): AppearanceSettings {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writeLocal(value: AppearanceSettings) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
        // ignore quota errors
    }
}

function merge(
    ...sources: (AppearanceSettings | undefined)[]
): AppearanceCore {
    const result = { ...APPEARANCE_DEFAULTS } as AppearanceCore;
    for (const s of sources) {
        if (!s) continue;
        if (s.theme) result.theme = s.theme;
        if (s.font) result.font = s.font;
        if (s.density) result.density = s.density;
        if (typeof s.fontScale === "number" && Number.isFinite(s.fontScale)) {
            result.fontScale = Math.min(
                1.25,
                Math.max(0.85, s.fontScale),
            );
        }
    }
    return result;
}

interface AppearanceContextValue {
    appearance: AppearanceCore;
    setTheme: (theme: AppearanceTheme) => void;
    setFont: (font: AppearanceFont) => void;
    setDensity: (density: AppearanceDensity) => void;
    setFontScale: (scale: number) => void;
    reset: () => void;
}

const AppearanceContext = createContext<AppearanceContextValue | undefined>(
    undefined,
);

export function AppearanceProvider({ children }: { children: ReactNode }) {
    const { profile } = useUserProfile();
    const { isAuthenticated } = useAuth();

    // Seed from localStorage so first render has the user's choices.
    const [appearance, setAppearance] = useState<AppearanceCore>(
        () => merge(readLocal()),
    );

    // Apply to DOM on every change.
    useEffect(() => {
        applyToDom(appearance);
        writeLocal(appearance);
    }, [appearance]);

    // Once the server profile arrives, prefer it over localStorage.
    useEffect(() => {
        if (!isAuthenticated || !profile?.appearance) return;
        setAppearance((prev) => merge(prev, profile.appearance));
    }, [isAuthenticated, profile?.appearance]);

    const { toast } = useToast();
    const persist = useCallback(
        async (next: AppearanceCore) => {
            if (!isAuthenticated) return;
            try {
                await updateUserProfile({ appearance: next });
            } catch (e) {
                // Don't unwind the optimistic UI on a sync failure; the
                // localStorage value is still authoritative for this device.
                toast({
                    title: "Appearance saved locally",
                    description:
                        "Server sync failed — your changes will sync on next sign-in.",
                    variant: "error",
                });
                console.error("[appearance] persist failed", e);
            }
        },
        [isAuthenticated, toast],
    );

    const update = useCallback(
        (partial: Partial<AppearanceCore>) => {
            setAppearance((prev) => {
                const next = { ...prev, ...partial };
                void persist(next);
                return next;
            });
        },
        [persist],
    );

    const value = useMemo<AppearanceContextValue>(
        () => ({
            appearance,
            setTheme: (theme) => update({ theme }),
            setFont: (font) => update({ font }),
            setDensity: (density) => update({ density }),
            setFontScale: (fontScale) =>
                update({
                    fontScale: Math.min(1.25, Math.max(0.85, fontScale)),
                }),
            reset: () => {
                const next = { ...APPEARANCE_DEFAULTS };
                setAppearance(next);
                void persist(next);
            },
        }),
        [appearance, update, persist],
    );

    return (
        <AppearanceContext.Provider value={value}>
            {children}
        </AppearanceContext.Provider>
    );
}

export function useAppearance(): AppearanceContextValue {
    const ctx = useContext(AppearanceContext);
    if (!ctx) {
        throw new Error(
            "useAppearance must be used within an AppearanceProvider",
        );
    }
    return ctx;
}

/**
 * Inlined into the <head> via dangerouslySetInnerHTML — runs before the React
 * tree hydrates so we don't paint with the default theme then flip to the
 * user's choice.
 */
export const APPEARANCE_BOOT_SCRIPT = `
(function() {
  try {
    var raw = localStorage.getItem('${STORAGE_KEY}');
    if (!raw) return;
    var v = JSON.parse(raw);
    var root = document.documentElement;
    if (v && typeof v === 'object') {
      if (typeof v.theme === 'string') root.setAttribute('data-theme', v.theme);
      if (typeof v.font === 'string') root.setAttribute('data-font', v.font);
      if (typeof v.density === 'string') root.setAttribute('data-density', v.density);
      if (typeof v.fontScale === 'number' && isFinite(v.fontScale)) {
        var scale = Math.min(1.25, Math.max(0.85, v.fontScale));
        root.style.setProperty('--font-scale', String(scale));
      }
    }
  } catch (_) {}
})();
`.trim();
