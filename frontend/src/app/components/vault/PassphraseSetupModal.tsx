"use client";

/**
 * First-time vault setup modal.
 *
 * Three steps:
 *   1. "Set up your encryption passphrase" — choose + confirm a passphrase.
 *      We enforce 12+ characters; we DO NOT enforce complex composition
 *      rules (NIST SP 800-63B explicitly recommends against them in favor
 *      of length + blocklist; we add the blocklist as a future TODO).
 *
 *   2. Show the 12-word recovery phrase. User must acknowledge.
 *
 *   3. Derive the KEK (PBKDF2, 600k iterations), generate a fresh salt,
 *      and call the consumer's `onComplete` callback with everything the
 *      caller needs to persist server-side (salt, wrapped-recovery-KEK, etc).
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";

import { kdf, recovery } from "@/app/lib/crypto";
import { RecoveryPhraseCard } from "./RecoveryPhraseCard";

interface SetupResult {
    /** Newly-generated salt. Persist server-side. */
    salt: Uint8Array;
    /** KEK derived from the passphrase. */
    kek: CryptoKey;
    /** KEK derived from the recovery phrase — used for the recovery path. */
    recoveryKek: CryptoKey;
    /** Salt used for the recovery KEK (separate from the passphrase salt). */
    recoverySalt: Uint8Array;
    /** The 12 words shown to the user. Caller MUST NOT persist this. */
    recoveryPhrase: string[];
}

interface Props {
    open: boolean;
    onCancel: () => void;
    onComplete: (result: SetupResult) => void | Promise<void>;
}

type Stage = "passphrase" | "recovery" | "deriving";

const MIN_LEN = 12;

export function PassphraseSetupModal({ open, onCancel, onComplete }: Props) {
    const [stage, setStage] = useState<Stage>("passphrase");
    const [pass1, setPass1] = useState("");
    const [pass2, setPass2] = useState("");
    const [reveal, setReveal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recoveryWords, setRecoveryWords] = useState<string[] | null>(null);
    const [busy, setBusy] = useState(false);

    const passOk = useMemo(() => {
        if (pass1.length < MIN_LEN) return false;
        if (pass1 !== pass2) return false;
        return true;
    }, [pass1, pass2]);

    if (!open) return null;

    const submitPassphrase = async () => {
        if (!passOk) {
            setError(
                pass1.length < MIN_LEN
                    ? `Passphrase must be at least ${MIN_LEN} characters.`
                    : "Passphrases don't match.",
            );
            return;
        }
        setError(null);
        const words = await recovery.generateRecoveryPhrase();
        setRecoveryWords(words);
        setStage("recovery");
    };

    const finalize = async () => {
        if (!recoveryWords) return;
        setBusy(true);
        setStage("deriving");
        try {
            const salt = kdf.generateSalt();
            const recoverySalt = kdf.generateSalt();
            // 600k PBKDF2 iterations on each — done in parallel to halve
            // wall-clock time on the user's first-setup wait.
            const [kek, recoveryKek] = await Promise.all([
                kdf.deriveKey(pass1, salt),
                kdf.deriveKey(recoveryWords.join(" "), recoverySalt),
            ]);
            // Best-effort: wipe the passphrase variables. JS strings are
            // immutable + interned, but reassigning helps GC.
            setPass1("");
            setPass2("");
            await onComplete({
                salt,
                kek,
                recoveryKek,
                recoverySalt,
                recoveryPhrase: recoveryWords,
            });
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Vault setup failed unexpectedly.",
            );
            setStage("recovery");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Set up your vault encryption passphrase"
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4"
        >
            <div className="w-full max-w-xl rounded-xl bg-stone-50 border border-stone-200 shadow-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-amber-700" />
                    <h2 className="font-serif text-lg font-semibold text-stone-900">
                        Set up your vault
                    </h2>
                </div>

                {stage === "passphrase" && (
                    <>
                        <p className="text-sm text-stone-700 font-serif leading-relaxed mb-5">
                            Your passphrase is the only thing standing between
                            the cloud and your documents. Louis never sees it
                            and cannot recover it.
                        </p>

                        <label className="block text-xs font-medium text-stone-700 mb-1">
                            Passphrase
                        </label>
                        <div className="relative mb-3">
                            <input
                                type={reveal ? "text" : "password"}
                                value={pass1}
                                onChange={(e) => setPass1(e.target.value)}
                                autoFocus
                                autoComplete="new-password"
                                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-mono"
                                placeholder={`At least ${MIN_LEN} characters`}
                            />
                            <button
                                type="button"
                                onClick={() => setReveal((v) => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700"
                                aria-label={
                                    reveal
                                        ? "Hide passphrase"
                                        : "Reveal passphrase"
                                }
                            >
                                {reveal ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        <label className="block text-xs font-medium text-stone-700 mb-1">
                            Confirm passphrase
                        </label>
                        <input
                            type={reveal ? "text" : "password"}
                            value={pass2}
                            onChange={(e) => setPass2(e.target.value)}
                            autoComplete="new-password"
                            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-mono mb-4"
                        />

                        {error && (
                            <p className="text-xs text-red-700 mb-3">{error}</p>
                        )}

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button
                                onClick={submitPassphrase}
                                disabled={!passOk}
                                className="bg-amber-700 hover:bg-amber-800 text-white"
                            >
                                Continue
                            </Button>
                        </div>
                    </>
                )}

                {stage === "recovery" && recoveryWords && (
                    <RecoveryPhraseCard
                        words={recoveryWords}
                        onAcknowledged={finalize}
                    />
                )}

                {stage === "deriving" && (
                    <div className="py-12 text-center text-sm text-stone-700 font-serif">
                        {busy
                            ? "Deriving your key (this takes a moment — 600,000 PBKDF2 iterations)…"
                            : "Almost done…"}
                    </div>
                )}
            </div>
        </div>
    );
}
