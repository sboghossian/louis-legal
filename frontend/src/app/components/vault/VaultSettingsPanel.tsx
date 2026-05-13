"use client";

/**
 * Vault settings panel — change passphrase, lock now.
 *
 * Behavior:
 *   - "Change passphrase" derives a new KEK and asks the parent to re-wrap
 *     all DEKs (via the `onRewrapAll` callback — the parent owns the
 *     server-state mutation so this component stays pure).
 *   - "Lock now" drops the in-memory KEK and forces a re-unlock next time
 *     the vault is opened.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LockKeyhole, RefreshCw } from "lucide-react";

import { kdf } from "@/app/lib/crypto";
import { useVaultKey } from "@/contexts/VaultKeyContext";

interface Props {
    /**
     * Called when the user wants to rotate the passphrase. Receives the
     * new KEK + new salt. The parent must:
     *   1. Unwrap every DEK with the OLD KEK (already in context).
     *   2. Wrap each with the NEW KEK.
     *   3. Persist the new wrapped-DEKs + new salt to the server.
     */
    onRewrapAll?: (args: {
        oldKek: CryptoKey;
        newKek: CryptoKey;
        newSalt: Uint8Array;
    }) => Promise<void>;
}

export function VaultSettingsPanel({ onRewrapAll }: Props) {
    const { kek, lock } = useVaultKey();
    const [pass1, setPass1] = useState("");
    const [pass2, setPass2] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const rotate = async () => {
        setMsg(null);
        setErr(null);
        if (pass1.length < 12 || pass1 !== pass2) {
            setErr("New passphrases must match and be at least 12 characters.");
            return;
        }
        if (!kek) {
            setErr("Vault is locked. Unlock first, then change passphrase.");
            return;
        }
        if (!onRewrapAll) {
            setErr("Rewrap handler not configured — cannot rotate yet.");
            return;
        }

        setBusy(true);
        try {
            const newSalt = kdf.generateSalt();
            const newKek = await kdf.deriveKey(pass1, newSalt);
            await onRewrapAll({ oldKek: kek, newKek, newSalt });
            setPass1("");
            setPass2("");
            setMsg(
                "Passphrase rotated. All wrapped keys have been re-encrypted.",
            );
        } catch (e) {
            setErr(
                e instanceof Error
                    ? e.message
                    : "Couldn't rotate passphrase. Try again.",
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-serif text-sm font-semibold text-foreground mb-1">
                    Change passphrase
                </h3>
                <p className="text-xs text-muted-foreground font-serif mb-3">
                    The new passphrase replaces the old one. We re-encrypt
                    every document key — the document blobs themselves never
                    leave the server.
                </p>
                <input
                    type="password"
                    value={pass1}
                    onChange={(e) => setPass1(e.target.value)}
                    placeholder="New passphrase (12+ characters)"
                    autoComplete="new-password"
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-mono mb-2"
                />
                <input
                    type="password"
                    value={pass2}
                    onChange={(e) => setPass2(e.target.value)}
                    placeholder="Confirm new passphrase"
                    autoComplete="new-password"
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-mono mb-3"
                />
                {err && <p className="text-xs text-red-700 mb-2">{err}</p>}
                {msg && (
                    <p className="text-xs text-emerald-700 mb-2">{msg}</p>
                )}
                <Button
                    onClick={rotate}
                    disabled={busy}
                    className="bg-amber-700 hover:bg-amber-800 text-white"
                >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    {busy ? "Rotating…" : "Rotate passphrase"}
                </Button>
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-serif text-sm font-semibold text-foreground mb-1">
                    Lock now
                </h3>
                <p className="text-xs text-muted-foreground font-serif mb-3">
                    Drop your key from this session. You&apos;ll need your
                    passphrase again next time you open the vault.
                </p>
                <Button variant="outline" onClick={lock}>
                    <LockKeyhole className="w-3.5 h-3.5 mr-1" />
                    Lock vault
                </Button>
            </section>
        </div>
    );
}
