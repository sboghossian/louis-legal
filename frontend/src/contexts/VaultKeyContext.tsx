"use client";

/**
 * VaultKeyContext — owns the user's in-memory Key Encryption Key (KEK).
 *
 * Lifecycle:
 *   1. On mount, attempt to rehydrate the KEK from sessionStorage. The
 *      stored value is the *non-extractable* CryptoKey reference's identity
 *      — actually, since CryptoKeys can't be serialized, we store the
 *      derived KEK material *re-derivation hints* (salt + iteration count
 *      only). The passphrase itself is never persisted; if the page
 *      refreshes, the user must re-enter the passphrase.
 *
 *   2. When the user submits a passphrase, we call `kdf.deriveKey` and
 *      keep the resulting non-extractable CryptoKey in component state.
 *
 *   3. On `lock()` we drop the reference. The browser's GC + the non-
 *      extractable flag means there's no reliable way to recover it.
 *
 * sessionStorage usage:
 *   We DO NOT persist key material. We persist only the *salt* (under
 *   key `louis.vaultKey.salt`) and a *flag* `louis.vaultKey.setupDone`
 *   indicating that the user has completed first-time setup. The actual
 *   KEK is in-memory only.
 *
 * Why sessionStorage for the salt at all? The salt is per-user, not per-
 * session — but the canonical copy lives on the server alongside the
 * wrapped DEKs. We mirror it locally to avoid an extra fetch on every
 * page open. Treat it as a cache, not the source of truth.
 */

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import { kdf } from "@/app/lib/crypto";

interface VaultKeyContextValue {
    /** True if the user has completed first-time vault setup. */
    isSetup: boolean;
    /** True if a KEK is currently held in memory (passphrase entered). */
    isUnlocked: boolean;
    /** The current KEK, or null if locked. */
    kek: CryptoKey | null;
    /** The user's salt (base64-encoded), or null if setup hasn't happened. */
    saltB64: string | null;

    /**
     * Mark first-time setup complete with this (newly-generated) salt and
     * derived KEK. Caller is responsible for persisting the salt server-side.
     */
    completeSetup: (salt: Uint8Array, kek: CryptoKey) => void;

    /** Unlock the vault with an existing salt + freshly-derived KEK. */
    unlock: (kek: CryptoKey) => void;

    /** Drop the in-memory KEK. */
    lock: () => void;

    /**
     * Convenience: derive + unlock from a passphrase. Uses the salt stored
     * in this context (so first-time setup must have happened).
     */
    unlockWithPassphrase: (passphrase: string) => Promise<void>;
}

const VaultKeyContext = createContext<VaultKeyContextValue | null>(null);

const SS_SALT_KEY = "louis.vaultKey.salt";
const SS_SETUP_FLAG = "louis.vaultKey.setupDone";

/**
 * Read the persisted setup hints from sessionStorage. Runs once at provider
 * mount (via the lazy `useState` initializer) so we don't trigger an
 * effect → setState cascade.
 */
function loadPersistedHints(): {
    saltB64: string | null;
    isSetup: boolean;
} {
    if (typeof window === "undefined") {
        return { saltB64: null, isSetup: false };
    }
    try {
        const storedSalt = window.sessionStorage.getItem(SS_SALT_KEY);
        const storedSetup = window.sessionStorage.getItem(SS_SETUP_FLAG);
        return {
            saltB64: storedSalt,
            isSetup: storedSetup === "1",
        };
    } catch {
        // sessionStorage can throw in private-browsing modes; treat as
        // "fresh user".
        return { saltB64: null, isSetup: false };
    }
}

export function VaultKeyProvider({ children }: { children: ReactNode }) {
    const [kek, setKek] = useState<CryptoKey | null>(null);
    const [saltB64, setSaltB64] = useState<string | null>(
        () => loadPersistedHints().saltB64,
    );
    const [isSetup, setIsSetup] = useState<boolean>(
        () => loadPersistedHints().isSetup,
    );

    // Auto-lock on tab visibility change to "hidden" for >10 minutes is a
    // potential future enhancement. For now we just lock on full unmount.
    const lockedRef = useRef(false);

    const completeSetup = useCallback((salt: Uint8Array, newKek: CryptoKey) => {
        const b64 = bytesToBase64(salt);
        try {
            window.sessionStorage.setItem(SS_SALT_KEY, b64);
            window.sessionStorage.setItem(SS_SETUP_FLAG, "1");
        } catch {
            // Soft-fail — context state still holds the values for this tab.
        }
        setSaltB64(b64);
        setIsSetup(true);
        setKek(newKek);
        lockedRef.current = false;
    }, []);

    const unlock = useCallback((newKek: CryptoKey) => {
        setKek(newKek);
        lockedRef.current = false;
    }, []);

    const lock = useCallback(() => {
        setKek(null);
        lockedRef.current = true;
    }, []);

    const unlockWithPassphrase = useCallback(
        async (passphrase: string) => {
            if (!saltB64) {
                throw new Error(
                    "vault: no salt — run completeSetup() before unlockWithPassphrase()",
                );
            }
            const salt = base64ToBytes(saltB64);
            const derived = await kdf.deriveKey(passphrase, salt);
            setKek(derived);
            lockedRef.current = false;
        },
        [saltB64],
    );

    const value = useMemo<VaultKeyContextValue>(
        () => ({
            isSetup,
            isUnlocked: kek !== null,
            kek,
            saltB64,
            completeSetup,
            unlock,
            lock,
            unlockWithPassphrase,
        }),
        [
            isSetup,
            kek,
            saltB64,
            completeSetup,
            unlock,
            lock,
            unlockWithPassphrase,
        ],
    );

    return (
        <VaultKeyContext.Provider value={value}>
            {children}
        </VaultKeyContext.Provider>
    );
}

export function useVaultKey(): VaultKeyContextValue {
    const ctx = useContext(VaultKeyContext);
    if (!ctx) {
        throw new Error(
            "useVaultKey must be called inside a <VaultKeyProvider>",
        );
    }
    return ctx;
}

// --- local base64 helpers (duplicated from app/lib/crypto/base64 because
// importing from `@/app/lib/crypto` here would create a circular module
// graph through index.ts at SSR time). Kept tiny on purpose. ---

function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        out[i] = binary.charCodeAt(i);
    }
    return out;
}
