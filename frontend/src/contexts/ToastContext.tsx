"use client";

/**
 * Toast — lightweight, dependency-free notification system.
 *
 *   const { toast } = useToast();
 *   toast({ title: "Saved", description: "Appearance updated" });
 *   toast({ title: "Failed to save", variant: "error" });
 *
 * Implementation:
 *   - One container fixed at the bottom-right (top-right in RTL).
 *   - Toasts auto-dismiss after 3.5s; user can dismiss with the close
 *     button or by clicking the toast.
 *   - Three variants — info (default), success, error — with sensible
 *     colors that respect the active appearance theme.
 *   - The provider is mounted in /components/providers.tsx so any
 *     client component anywhere in the tree can call useToast().
 */

import {
    createContext,
    useCallback,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastVariant = "info" | "success" | "error";

export interface ToastOptions {
    title: string;
    description?: string;
    variant?: ToastVariant;
    /** ms; defaults to 3500. Pass 0 for sticky. */
    durationMs?: number;
}

interface ToastEntry extends ToastOptions {
    id: string;
}

interface ToastContextValue {
    toast: (options: ToastOptions) => void;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<ToastEntry[]>([]);

    const dismiss = useCallback((id: string) => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const toast = useCallback(
        (options: ToastOptions) => {
            const id = `toast-${++nextId}`;
            const entry: ToastEntry = { ...options, id };
            setEntries((prev) => [...prev, entry]);
            const duration = options.durationMs ?? 3500;
            if (duration > 0) {
                setTimeout(() => dismiss(id), duration);
            }
        },
        [dismiss],
    );

    return (
        <ToastContext.Provider value={{ toast, dismiss }}>
            {children}
            <ToastViewport entries={entries} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        // Soft-fail with a no-op so a missing provider doesn't crash
        // pages — but log in dev so we catch the regression.
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "useToast called outside ToastProvider — falling back to no-op.",
            );
        }
        return { toast: () => undefined, dismiss: () => undefined };
    }
    return ctx;
}

const VARIANT_STYLES: Record<
    ToastVariant,
    { ring: string; icon: React.ComponentType<{ className?: string }>; iconClass: string }
> = {
    info:    { ring: "ring-gray-200",       icon: Info,         iconClass: "text-muted-foreground" },
    success: { ring: "ring-emerald-200",    icon: CheckCircle2, iconClass: "text-emerald-600" },
    error:   { ring: "ring-red-200",        icon: AlertTriangle, iconClass: "text-red-600" },
};

function ToastViewport({
    entries,
    onDismiss,
}: {
    entries: ToastEntry[];
    onDismiss: (id: string) => void;
}) {
    const [isRTL, setIsRTL] = useState(false);
    useEffect(() => {
        if (typeof document !== "undefined") {
            setIsRTL(document.documentElement.dir === "rtl");
        }
    }, []);

    if (entries.length === 0) return null;

    const align = isRTL ? "left-4" : "right-4";

    return (
        <div
            aria-live="polite"
            className={`fixed z-[300] bottom-4 ${align} flex flex-col gap-2 max-w-sm pointer-events-none`}
        >
            {entries.map((e) => {
                const v = VARIANT_STYLES[e.variant ?? "info"];
                const Icon = v.icon;
                return (
                    <div
                        key={e.id}
                        role="status"
                        onClick={() => onDismiss(e.id)}
                        className={`pointer-events-auto bg-card border border-border ${v.ring} ring-2 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 cursor-pointer transition-all`}
                    >
                        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${v.iconClass}`} />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">
                                {e.title}
                            </div>
                            {e.description && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    {e.description}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={(ev) => {
                                ev.stopPropagation();
                                onDismiss(e.id);
                            }}
                            className="text-muted-foreground hover:text-foreground/80"
                            aria-label="Dismiss"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
