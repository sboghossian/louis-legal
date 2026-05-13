"use client";

/**
 * ConfirmDialog — replaces native window.confirm() with a styled,
 * translatable, themeable modal in the Louis design system.
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *       title: "Delete this?",
 *       message: "This action is permanent.",
 *       destructive: true,
 *   });
 *   if (!ok) return;
 *
 * Implementation:
 *   - One modal at a time. The provider holds an options object + a
 *     resolver in state. Calling confirm() pushes options and returns
 *     a Promise that resolves true (confirm) or false (cancel).
 *   - Portal-rendered to <body>, centered, with a translucent backdrop.
 *   - Esc and outside-backdrop click are treated as cancel.
 *   - Respects prefers-reduced-motion (no fade-in).
 *   - TODO: focus trap. For now the confirm button gets initial focus.
 *
 * Apple quiet-luxury aesthetic: cream card, gold-leaf accents via the
 * theme's primary/destructive tokens, generous whitespace.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

export interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
}

type Resolver = (value: boolean) => void;

interface ConfirmContextValue {
    confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

interface PendingConfirm {
    options: ConfirmOptions;
    resolve: Resolver;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<PendingConfirm | null>(null);
    const [mounted, setMounted] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const { t } = useLocale();
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    // Portal target only exists in the browser.
    useEffect(() => {
        setMounted(true);
        if (typeof window !== "undefined" && window.matchMedia) {
            const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
            setReducedMotion(mq.matches);
            const onChange = (e: MediaQueryListEvent) =>
                setReducedMotion(e.matches);
            mq.addEventListener("change", onChange);
            return () => mq.removeEventListener("change", onChange);
        }
    }, []);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            setPending((prev) => {
                // If something is already open, immediately resolve it as
                // cancelled so we never strand a previous caller.
                prev?.resolve(false);
                return { options, resolve };
            });
        });
    }, []);

    const resolveAndClose = useCallback((value: boolean) => {
        setPending((prev) => {
            prev?.resolve(value);
            return null;
        });
    }, []);

    // Esc dismisses as cancel.
    useEffect(() => {
        if (!pending) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.preventDefault();
                resolveAndClose(false);
            }
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [pending, resolveAndClose]);

    // Initial focus on the confirm button when opened.
    useEffect(() => {
        if (pending) {
            // Defer until portal renders.
            const id = window.setTimeout(() => {
                confirmButtonRef.current?.focus();
            }, 0);
            return () => window.clearTimeout(id);
        }
    }, [pending]);

    const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            {mounted && pending
                ? createPortal(
                      <ConfirmDialog
                          options={pending.options}
                          reducedMotion={reducedMotion}
                          onCancel={() => resolveAndClose(false)}
                          onConfirm={() => resolveAndClose(true)}
                          confirmButtonRef={confirmButtonRef}
                          t={t}
                      />,
                      document.body,
                  )
                : null}
        </ConfirmContext.Provider>
    );
}

export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        // Soft-fail with a no-op (returns false) so a missing provider
        // doesn't crash the page. Log in dev.
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "useConfirm called outside ConfirmDialogProvider — falling back to cancel.",
            );
        }
        return async () => false;
    }
    return ctx.confirm;
}

function ConfirmDialog({
    options,
    reducedMotion,
    onCancel,
    onConfirm,
    confirmButtonRef,
    t,
}: {
    options: ConfirmOptions;
    reducedMotion: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    confirmButtonRef: React.RefObject<HTMLButtonElement | null>;
    t: (key: string, vars?: Record<string, string | number>) => string;
}) {
    const {
        title,
        message,
        confirmLabel,
        cancelLabel,
        destructive,
    } = options;

    const resolvedConfirmLabel =
        confirmLabel ??
        (destructive
            ? t("dialog.destructive.continue")
            : t("dialog.confirm.continue"));
    const resolvedCancelLabel = cancelLabel ?? t("dialog.confirm.cancel");

    const fadeClass = reducedMotion ? "" : "animate-in fade-in duration-150";

    return (
        <div
            className={`fixed inset-0 z-[400] flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm ${fadeClass}`}
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby={message ? "confirm-dialog-message" : undefined}
                className="bg-card border border-border rounded-2xl shadow-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <h2
                    id="confirm-dialog-title"
                    className="font-serif text-lg font-medium text-foreground"
                >
                    {title}
                </h2>
                {message ? (
                    <p
                        id="confirm-dialog-message"
                        className="mt-2 text-sm text-muted-foreground leading-relaxed"
                    >
                        {message}
                    </p>
                ) : null}
                <div className="mt-6 flex items-center justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                    >
                        {resolvedCancelLabel}
                    </Button>
                    <Button
                        ref={confirmButtonRef}
                        type="button"
                        size="sm"
                        onClick={onConfirm}
                        className={
                            destructive
                                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                : undefined
                        }
                    >
                        {resolvedConfirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
