"use client";

/**
 * Recovery-phrase display card.
 *
 * Shown ONCE during first-time setup. The user must:
 *   1. See all 12 words on screen (no "click to reveal" — they need to
 *      write them down, not screenshot them; we trust them with the trade).
 *   2. Tick the acknowledgement checkbox.
 *   3. Click "I have saved my recovery phrase" to advance.
 *
 * The card explicitly does NOT offer a "copy to clipboard" button by
 * default — that nudges users away from screenshots / clipboard managers
 * that might persist the phrase. There's a small "Copy once" link as an
 * escape hatch, with a warning.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Copy, Check } from "lucide-react";

interface Props {
    words: string[];
    onAcknowledged: () => void;
}

export function RecoveryPhraseCard({ words, onAcknowledged }: Props) {
    const [ack, setAck] = useState(false);
    const [copied, setCopied] = useState(false);

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(words.join(" "));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard API can throw in some browsers; soft-fail.
        }
    };

    return (
        <div
            className={[
                "rounded-xl border border-amber-200/80 bg-amber-50/40",
                "p-6 max-w-xl mx-auto",
            ].join(" ")}
        >
            <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-800" />
                <h3 className="font-serif text-base font-semibold text-foreground">
                    Your recovery phrase
                </h3>
            </div>
            <p className="text-sm text-foreground/80 font-serif leading-relaxed mb-4">
                Write these 12 words down on paper and store them somewhere
                safe. If you forget your passphrase, this is the only way to
                regain access — Louis cannot recover it for you.
            </p>

            <ol
                className={[
                    "grid grid-cols-3 gap-2 mb-4",
                    "rounded-md border border-amber-200/70 bg-card/80 p-3",
                ].join(" ")}
            >
                {words.map((w, i) => (
                    <li
                        key={i}
                        className="flex items-baseline gap-1.5 text-sm font-mono text-foreground"
                    >
                        <span className="text-[10px] text-muted-foreground w-4 text-right">
                            {i + 1}.
                        </span>
                        <span>{w}</span>
                    </li>
                ))}
            </ol>

            <div className="flex items-center justify-between mb-4">
                <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900 underline-offset-2 hover:underline"
                >
                    {copied ? (
                        <>
                            <Check className="w-3 h-3" />
                            Copied — paste it somewhere safe and clear your
                            clipboard.
                        </>
                    ) : (
                        <>
                            <Copy className="w-3 h-3" />
                            Copy once (clipboard managers may persist it)
                        </>
                    )}
                </button>
            </div>

            <label className="flex items-start gap-2 text-sm text-foreground font-serif mb-4 cursor-pointer">
                <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                    className="mt-1 accent-amber-700"
                />
                <span>
                    I have saved my recovery phrase. I understand Louis cannot
                    recover my vault if I lose both my passphrase and this
                    phrase.
                </span>
            </label>

            <Button
                onClick={onAcknowledged}
                disabled={!ack}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white"
            >
                Continue
            </Button>
        </div>
    );
}
