"use client";

/**
 * Locale + translation context.
 *
 * Source of truth for the user's language:
 *   1. Server profile (appearance.language) if signed in.
 *   2. localStorage `louis.locale` for signed-out users.
 *   3. `navigator.language` short tag, if one of our supported locales.
 *   4. "en".
 *
 * Writes `lang` and `dir` attributes on <html> (RTL for Arabic) so CSS
 * selectors and screen readers see the right thing. The Appearance boot
 * script in <head> re-applies the same attributes synchronously before
 * React hydrates, so the first paint isn't always-English.
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
    DICTIONARIES,
    LOCALES,
    RTL_LOCALES,
    lookup,
    type Locale,
} from "@/i18n/dictionaries";
import { updateUserProfile } from "@/app/lib/louisApi";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "louis.locale";
const SUPPORTED_CODES = new Set(LOCALES.map((l) => l.code));

function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && SUPPORTED_CODES.has(value as Locale);
}

function detectInitialLocale(): Locale {
    if (typeof window === "undefined") return "en";
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (isLocale(stored)) return stored;
    } catch {
        /* ignore */
    }
    const nav = navigator?.language ? navigator.language.slice(0, 2) : "";
    if (isLocale(nav)) return nav;
    return "en";
}

function applyToDom(locale: Locale) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("lang", locale);
    root.setAttribute(
        "dir",
        (RTL_LOCALES as string[]).includes(locale) ? "rtl" : "ltr",
    );
}

interface LocaleContextValue {
    locale: Locale;
    setLocale: (l: Locale) => void;
    t: (key: string, vars?: Record<string, string | number>) => string;
    isRTL: boolean;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
    const { profile } = useUserProfile();
    const { isAuthenticated } = useAuth();
    const [locale, setLocaleState] = useState<Locale>(() =>
        detectInitialLocale(),
    );

    // Sync from server profile when available.
    useEffect(() => {
        const lang = profile?.appearance?.language;
        if (isAuthenticated && isLocale(lang) && lang !== locale) {
            setLocaleState(lang);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, profile?.appearance?.language]);

    // Apply lang + dir + persist locally on every change.
    useEffect(() => {
        applyToDom(locale);
        try {
            window.localStorage.setItem(STORAGE_KEY, locale);
        } catch {
            /* ignore quota */
        }
    }, [locale]);

    const setLocale = useCallback(
        (next: Locale) => {
            setLocaleState(next);
            if (isAuthenticated) {
                void updateUserProfile({
                    appearance: {
                        ...(profile?.appearance ?? {}),
                        language: next,
                    },
                }).catch(() => {
                    // Local change is still authoritative on this device.
                });
            }
        },
        [isAuthenticated, profile?.appearance],
    );

    const t = useCallback(
        (key: string, vars?: Record<string, string | number>): string => {
            let value = lookup(locale, key);
            if (vars) {
                for (const [k, v] of Object.entries(vars)) {
                    value = value.replace(`{${k}}`, String(v));
                }
            }
            return value;
        },
        [locale],
    );

    const value = useMemo<LocaleContextValue>(
        () => ({
            locale,
            setLocale,
            t,
            isRTL: (RTL_LOCALES as string[]).includes(locale),
        }),
        [locale, setLocale, t],
    );

    return (
        <LocaleContext.Provider value={value}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale(): LocaleContextValue {
    const ctx = useContext(LocaleContext);
    if (!ctx) {
        throw new Error("useLocale must be used within a LocaleProvider");
    }
    return ctx;
}

// Inlined into <head> via dangerouslySetInnerHTML — runs before React
// hydrates so the first paint already has the right `lang` and `dir`.
export const LOCALE_BOOT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var supported = ${JSON.stringify(Array.from(SUPPORTED_CODES))};
    var rtl = ${JSON.stringify(RTL_LOCALES)};
    var lang = stored && supported.indexOf(stored) !== -1 ? stored : null;
    if (!lang) {
      var nav = (navigator.language || '').slice(0, 2);
      if (supported.indexOf(nav) !== -1) lang = nav;
    }
    if (!lang) lang = 'en';
    var root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', rtl.indexOf(lang) !== -1 ? 'rtl' : 'ltr');
  } catch (_) {}
})();
`.trim();

// Tiny helper for consumers that just need to know which dictionaries
// exist (e.g. the appearance language picker).
export { LOCALES, DICTIONARIES };
