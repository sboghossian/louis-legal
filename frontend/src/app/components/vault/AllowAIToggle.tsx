"use client";

/**
 * "Allow Louis to read this for the next chat" toggle.
 *
 * The user explicitly trades E2EE for AI assistance on a per-document
 * basis. The trade-off is shown in plain English so the user can't toggle
 * this without seeing what they're giving up.
 *
 * Behavior contract (consumed by the document viewer):
 *   - When ON, the document viewer decrypts the blob in-browser and
 *     attaches the plaintext to the next chat request.
 *   - "Next chat" means: until the user navigates away from the document
 *     viewer OR closes the chat panel. After that, the consumer is
 *     expected to call `onRelock()`.
 *   - This component owns only the UI + confirm step. It does NOT
 *     persist the "allowed" state anywhere — that's deliberately ephemeral.
 */

import { useState } from "react";
import { Sparkles, Lock, AlertTriangle } from "lucide-react";

interface Props {
    allowed: boolean;
    onChange: (allowed: boolean) => void;
    /** Optional doc label for clarity. */
    documentName?: string;
}

export function AllowAIToggle({ allowed, onChange, documentName }: Props) {
    const [confirming, setConfirming] = useState(false);

    const turnOn = () => {
        setConfirming(false);
        onChange(true);
    };

    if (confirming) {
        return (
            <div
                className={[
                    "rounded-md border border-amber-300 bg-amber-50 p-3",
                    "text-xs text-stone-800 font-serif",
                ].join(" ")}
            >
                <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5" />
                    <div>
                        <p className="font-medium text-stone-900 mb-1">
                            Allow Louis to read{" "}
                            {documentName ? (
                                <span className="font-mono">
                                    {documentName}
                                </span>
                            ) : (
                                "this document"
                            )}
                            ?
                        </p>
                        <p className="leading-relaxed">
                            Once you allow read, the cloud sees plaintext for
                            that chat session. The document will be re-locked
                            when you leave this page.
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        className="text-xs text-stone-600 hover:underline"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={turnOn}
                        className="text-xs bg-amber-700 hover:bg-amber-800 text-white px-3 py-1 rounded-md"
                    >
                        Allow for this chat
                    </button>
                </div>
            </div>
        );
    }

    if (allowed) {
        return (
            <button
                type="button"
                onClick={() => onChange(false)}
                className={[
                    "inline-flex items-center gap-1.5 text-xs",
                    "rounded-md border border-amber-300 bg-amber-50",
                    "px-2.5 py-1 text-amber-900",
                    "hover:bg-amber-100",
                ].join(" ")}
                title="Click to re-lock this document for AI."
            >
                <Sparkles className="w-3 h-3" />
                Louis can read this · click to re-lock
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setConfirming(true)}
            className={[
                "inline-flex items-center gap-1.5 text-xs",
                "rounded-md border border-stone-300 bg-stone-50",
                "px-2.5 py-1 text-stone-700",
                "hover:bg-stone-100",
            ].join(" ")}
            title="Temporarily decrypt this document so Louis can use it."
        >
            <Lock className="w-3 h-3" />
            Allow Louis to read this for the next chat
        </button>
    );
}
