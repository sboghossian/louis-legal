"use client";

/**
 * Gold-leaf "End-to-end encrypted" badge.
 *
 * Used on vault document cards. The badge is intentionally calm — quiet
 * luxury, not a security alarm. Red is reserved for *failure* states
 * (key missing, decrypt failed); a successful E2EE state is positive and
 * gets the gold-leaf treatment.
 */

import { Lock, LockKeyhole, AlertTriangle } from "lucide-react";

export type EncryptionStatus =
    | "e2ee"
    | "server-only"
    | "locked"
    | "decrypt-failed";

interface Props {
    status: EncryptionStatus;
    /** If true, render only the icon. Useful in tight card corners. */
    compact?: boolean;
    className?: string;
}

export function EncryptionBadge({ status, compact, className = "" }: Props) {
    if (status === "e2ee") {
        return (
            <span
                title="End-to-end encrypted. The cloud cannot read this."
                className={[
                    "inline-flex items-center gap-1 rounded-full",
                    "border border-amber-200/70 bg-amber-50/70",
                    "text-[11px] font-medium",
                    // Gold-leaf accent — warmer than pure yellow.
                    "text-amber-800",
                    compact ? "px-1.5 py-0.5" : "px-2 py-0.5",
                    className,
                ].join(" ")}
            >
                <Lock className="w-3 h-3" aria-hidden />
                {!compact && <span>End-to-end encrypted</span>}
            </span>
        );
    }

    if (status === "server-only") {
        return (
            <span
                title="Encrypted at rest on the server. The cloud can still read this."
                className={[
                    "inline-flex items-center gap-1 rounded-full",
                    "border border-stone-200 bg-stone-50",
                    "text-[11px] font-medium text-stone-600",
                    compact ? "px-1.5 py-0.5" : "px-2 py-0.5",
                    className,
                ].join(" ")}
            >
                <LockKeyhole className="w-3 h-3" aria-hidden />
                {!compact && <span>Server-encrypted</span>}
            </span>
        );
    }

    if (status === "locked") {
        return (
            <span
                title="Unlock the vault with your passphrase to read this."
                className={[
                    "inline-flex items-center gap-1 rounded-full",
                    "border border-stone-300 bg-stone-100",
                    "text-[11px] font-medium text-stone-700",
                    compact ? "px-1.5 py-0.5" : "px-2 py-0.5",
                    className,
                ].join(" ")}
            >
                <LockKeyhole className="w-3 h-3" aria-hidden />
                {!compact && <span>Locked</span>}
            </span>
        );
    }

    // decrypt-failed — the *only* red state in this component.
    return (
        <span
            title="Decryption failed. Wrong key or tampered ciphertext."
            className={[
                "inline-flex items-center gap-1 rounded-full",
                "border border-red-200 bg-red-50",
                "text-[11px] font-medium text-red-700",
                compact ? "px-1.5 py-0.5" : "px-2 py-0.5",
                className,
            ].join(" ")}
        >
            <AlertTriangle className="w-3 h-3" aria-hidden />
            {!compact && <span>Decrypt failed</span>}
        </span>
    );
}
