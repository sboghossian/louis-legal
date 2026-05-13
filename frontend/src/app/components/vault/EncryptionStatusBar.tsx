"use client";

/**
 * One-line top bar that appears in the document viewer when a vault
 * document is open. Tells the user, in plain English, what guarantee they
 * have right now.
 */

import { Lock } from "lucide-react";

interface Props {
    /** Optional: name of the document, used in the accessibility label. */
    documentName?: string;
}

export function EncryptionStatusBar({ documentName }: Props) {
    return (
        <div
            role="status"
            aria-label={
                documentName
                    ? `${documentName} is end-to-end encrypted with your key`
                    : "Document is end-to-end encrypted with your key"
            }
            className={[
                "flex items-center gap-2",
                "px-3 py-1.5 rounded-md",
                "border border-amber-200/70 bg-amber-50/60",
                "text-[12px] text-amber-900",
                "font-serif",
            ].join(" ")}
        >
            <Lock className="w-3.5 h-3.5 text-amber-700" aria-hidden />
            <span>
                End-to-end encrypted with your key.{" "}
                <span className="text-amber-800/80">
                    The cloud cannot read this.
                </span>
            </span>
        </div>
    );
}
