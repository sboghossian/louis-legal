"use client";

/**
 * Returning-user unlock modal. Shown on Vault page open when no KEK is in
 * memory (e.g. fresh tab). Offers two paths:
 *   - "I know my passphrase" (default)
 *   - "I lost my passphrase — use recovery phrase"
 *
 * Both paths produce a KEK and call `onUnlocked`. The recovery path also
 * surfaces a banner reminding the user to set a new passphrase after.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { KeyRound, Eye, EyeOff, RotateCcw } from "lucide-react";

import { useLocale } from "@/contexts/LocaleContext";
import { kdf, recovery } from "@/app/lib/crypto";

interface Props {
    open: boolean;
    /** User's passphrase salt, base64. Loaded from server / sessionStorage. */
    saltB64: string;
    /** Recovery salt — needed only if user uses recovery path. */
    recoverySaltB64?: string;

    onCancel: () => void;
    onUnlocked: (args: {
        kek: CryptoKey;
        usedRecoveryPath: boolean;
    }) => void | Promise<void>;
}

type Mode = "passphrase" | "recovery";

export function PassphraseUnlockModal({
    open,
    saltB64,
    recoverySaltB64,
    onCancel,
    onUnlocked,
}: Props) {
    const { t } = useLocale();
    const [mode, setMode] = useState<Mode>("passphrase");
    const [pass, setPass] = useState("");
    const [reveal, setReveal] = useState(false);
    const [phrase, setPhrase] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    if (!open) return null;

    const tryPassphrase = async () => {
        setError(null);
        setBusy(true);
        try {
            const salt = base64ToBytes(saltB64);
            const kek = await kdf.deriveKey(pass, salt);
            setPass("");
            await onUnlocked({ kek, usedRecoveryPath: false });
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : t("vault.unlock.derive_failed"),
            );
        } finally {
            setBusy(false);
        }
    };

    const tryRecovery = async () => {
        setError(null);
        if (!recoverySaltB64) {
            setError(t("vault.recovery.unavailable"));
            return;
        }
        const words = recovery.normalizePhrase(phrase);
        if (!(await recovery.validateRecoveryPhrase(words))) {
            setError(t("vault.recovery.invalid"));
            return;
        }
        setBusy(true);
        try {
            const salt = base64ToBytes(recoverySaltB64);
            const kek = await kdf.deriveKey(words.join(" "), salt);
            setPhrase("");
            await onUnlocked({ kek, usedRecoveryPath: true });
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : t("vault.recovery.derive_failed"),
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Unlock your vault"
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4"
        >
            <div className="w-full max-w-md rounded-xl bg-stone-50 border border-stone-200 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                    <KeyRound className="w-5 h-5 text-amber-700" />
                    <h2 className="font-serif text-lg font-semibold text-stone-900">
                        {t("vault.unlock.title")}
                    </h2>
                </div>

                {mode === "passphrase" ? (
                    <>
                        <p className="text-sm text-stone-700 font-serif mb-4">
                            {t("vault.unlock.intro")}
                        </p>
                        <div className="relative mb-3">
                            <input
                                type={reveal ? "text" : "password"}
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                autoFocus
                                autoComplete="current-password"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") tryPassphrase();
                                }}
                                className="w-full rounded-md border border-stone-300 bg-card px-3 py-2 text-sm font-mono"
                                placeholder={t("vault.unlock.placeholder")}
                            />
                            <button
                                type="button"
                                onClick={() => setReveal((v) => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700"
                                aria-label={
                                    reveal
                                        ? t("vault.setup.hide")
                                        : t("vault.setup.reveal")
                                }
                            >
                                {reveal ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setMode("recovery");
                                setError(null);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-amber-800 hover:underline mb-4"
                        >
                            <RotateCcw className="w-3 h-3" />
                            {t("vault.unlock.lost")}
                        </button>

                        {error && (
                            <p className="text-xs text-red-700 mb-3">{error}</p>
                        )}

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={onCancel}>
                                {t("action.cancel")}
                            </Button>
                            <Button
                                onClick={tryPassphrase}
                                disabled={pass.length === 0 || busy}
                                className="bg-amber-700 hover:bg-amber-800 text-white"
                            >
                                {busy ? t("vault.unlock.busy") : t("vault.unlock.button")}
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-stone-700 font-serif mb-2">
                            {t("vault.recovery.intro")}
                        </p>
                        <p className="text-xs text-stone-500 font-serif mb-3">
                            {t("vault.recovery.reminder")}
                        </p>
                        <textarea
                            value={phrase}
                            onChange={(e) => setPhrase(e.target.value)}
                            rows={4}
                            className="w-full rounded-md border border-stone-300 bg-card px-3 py-2 text-sm font-mono mb-3"
                            placeholder={t("vault.recovery.placeholder")}
                        />

                        <button
                            type="button"
                            onClick={() => {
                                setMode("passphrase");
                                setError(null);
                            }}
                            className="text-xs text-stone-600 hover:underline mb-3 block"
                        >
                            {t("vault.recovery.back")}
                        </button>

                        {error && (
                            <p className="text-xs text-red-700 mb-3">{error}</p>
                        )}

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={onCancel}>
                                {t("action.cancel")}
                            </Button>
                            <Button
                                onClick={tryRecovery}
                                disabled={phrase.trim().length === 0 || busy}
                                className="bg-amber-700 hover:bg-amber-800 text-white"
                            >
                                {busy ? t("vault.recovery.busy") : t("vault.recovery.button")}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        out[i] = binary.charCodeAt(i);
    }
    return out;
}
