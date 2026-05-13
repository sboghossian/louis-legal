"use client";

// Full-screen "voice mode" — opens when the user clicks the AudioLines
// button next to the Mic in the composer. Streams interim transcripts
// from the Web Speech API, auto-submits when the user stops speaking
// for the configured silence threshold (default 1.5s), then waits for
// the assistant reply (the parent ChatInput.onSubmit pipeline already
// handles streaming + persistence). When the next assistant message
// arrives, the SpeakMessage component reads it aloud — this overlay is
// pure dictation + status.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, AudioLines, Pause, Play, ArrowRight } from "lucide-react";
import {
    getSpeechRecognitionCtor,
    readVoicePrefs,
    type MinimalSpeechRecognition,
} from "@/app/lib/voice/types";
import { detectVoiceCommand } from "@/app/lib/voice/speakToCite";
import { setVoiceModeOpen } from "@/app/lib/voice/voiceModeBus";
import { useLocale } from "@/contexts/LocaleContext";

type OverlayStatus = "listening" | "thinking" | "speaking" | "paused";

interface Props {
    open: boolean;
    onClose: () => void;
    /** Fires when the overlay decides the user finished a thought and
     *  wants to send. The parent (ChatInput) forwards this through the
     *  same path as a typed-and-Enter submission. */
    onSubmitTranscript: (transcript: string) => void;
    /** Set to "speaking" while the assistant's reply is being read aloud
     *  by SpeakMessage. Set back to "listening" when TTS finishes and the
     *  user can speak again. Controlled by the parent. */
    externalStatus?: OverlayStatus;
}

export function VoiceModeOverlay({
    open,
    onClose,
    onSubmitTranscript,
    externalStatus,
}: Props) {
    const { t } = useLocale();
    const [mounted, setMounted] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interim, setInterim] = useState("");
    const [paused, setPaused] = useState(false);
    const [status, setStatus] = useState<OverlayStatus>("listening");
    const recogRef = useRef<MinimalSpeechRecognition | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transcriptRef = useRef("");
    // Mirror prefs once on open; we don't need to react to changes
    // mid-session.
    const prefs = useMemo(() => readVoicePrefs(), [open]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Broadcast open state so SpeakMessage instances deep in the chat
    // can auto-play freshly arrived assistant replies.
    useEffect(() => {
        setVoiceModeOpen(open);
        return () => setVoiceModeOpen(false);
    }, [open]);

    // ----- Recogniser lifecycle ------------------------------------------
    const stopRecogniser = useCallback(() => {
        const rec = recogRef.current;
        if (rec) {
            try {
                rec.stop();
            } catch {
                // ignore
            }
        }
    }, []);

    const startRecogniser = useCallback(() => {
        const Ctor = getSpeechRecognitionCtor();
        if (!Ctor) return null;
        const rec = new Ctor();
        rec.lang =
            (typeof navigator !== "undefined" && navigator.language) || "en-US";
        rec.interimResults = true;
        rec.continuous = true;
        rec.onstart = () => setStatus("listening");
        rec.onresult = (e) => {
            let nextInterim = "";
            let nextFinal = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i];
                if (r.isFinal) nextFinal += r[0].transcript;
                else nextInterim += r[0].transcript;
            }
            if (nextFinal) {
                setTranscript((prev) => {
                    const merged = prev
                        ? `${prev} ${nextFinal.trim()}`
                        : nextFinal.trim();
                    transcriptRef.current = merged;
                    return merged;
                });
                setInterim("");
            } else {
                setInterim(nextInterim);
            }
            // Reset silence timer on any new content (interim or final).
            scheduleAutoSubmit();
        };
        rec.onerror = () => {
            // Most errors mean "no audio" or "aborted" — surface paused so
            // the user can tap resume.
            setPaused(true);
            setStatus("paused");
        };
        rec.onend = () => {
            // Continuous mode still ends sometimes (long silence, focus
            // loss). If we're not deliberately paused, restart.
            if (!pausedRef.current && openRef.current) {
                try {
                    rec.start();
                } catch {
                    // already started
                }
            }
        };
        try {
            rec.start();
        } catch {
            // Some browsers throw if start() is called twice. Safe to ignore.
        }
        recogRef.current = rec;
        return rec;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Need stable refs for callbacks that fire after closures captured.
    const pausedRef = useRef(false);
    const openRef = useRef(false);
    useEffect(() => {
        pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
        openRef.current = open;
    }, [open]);

    // ----- Auto-submit on silence ----------------------------------------
    const scheduleAutoSubmit = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        const ms = prefs.silenceMs;
        silenceTimerRef.current = setTimeout(() => {
            const final = transcriptRef.current.trim();
            const wordCount = final.split(/\s+/).filter(Boolean).length;
            // Only auto-submit when we have a real thought (> 4 words).
            if (wordCount > 4 && !pausedRef.current) {
                doSubmit(final);
            }
        }, ms);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefs.silenceMs]);

    const doSubmit = useCallback(
        (raw: string) => {
            const trimmed = raw.trim();
            if (!trimmed) return;
            // Speak-to-cite — if a recognised command is detected we
            // rewrite the payload before forwarding to chat. The model
            // sees a focused question, not the bare command.
            const cmd = detectVoiceCommand(trimmed);
            let payload = trimmed;
            if (cmd?.type === "cite") {
                payload = `Cite the source for: ${cmd.query}`;
            } else if (cmd?.type === "page") {
                payload = `Show me page ${cmd.page} of the relevant document.`;
            } else if (cmd?.type === "rate") {
                // Rate change — adjust local prefs (transient — overlay
                // closure will re-read on next open). Don't forward to
                // chat.
                try {
                    const cur = readVoicePrefs();
                    const next = Math.max(
                        0.5,
                        Math.min(2.0, cur.rate + cmd.delta),
                    );
                    window.localStorage.setItem(
                        "louis.voicePrefs",
                        JSON.stringify({ ...cur, rate: next }),
                    );
                } catch {
                    // ignore
                }
                // Clear and keep listening.
                setTranscript("");
                setInterim("");
                transcriptRef.current = "";
                return;
            }
            // Pause the recogniser while we wait for the reply — the
            // parent will flip externalStatus to "speaking" once the TTS
            // starts, and we resume after.
            stopRecogniser();
            setStatus("thinking");
            setTranscript("");
            setInterim("");
            transcriptRef.current = "";
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            onSubmitTranscript(payload);
        },
        [onSubmitTranscript, stopRecogniser],
    );

    // ----- Mount / unmount lifecycle -------------------------------------
    useEffect(() => {
        if (!open) {
            // Cleanup on close.
            stopRecogniser();
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            setTranscript("");
            setInterim("");
            transcriptRef.current = "";
            setPaused(false);
            setStatus("listening");
            return;
        }
        startRecogniser();
        return () => {
            stopRecogniser();
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        };
    }, [open, startRecogniser, stopRecogniser]);

    // When the parent signals the assistant is replying / done speaking,
    // override our internal status and re-arm the recogniser once it
    // finishes.
    useEffect(() => {
        if (!open) return;
        if (externalStatus === "speaking") {
            setStatus("speaking");
            stopRecogniser();
        } else if (externalStatus === "thinking") {
            setStatus("thinking");
        } else if (externalStatus === "listening") {
            // Resume listening after the assistant finished.
            setStatus("listening");
            if (!pausedRef.current) startRecogniser();
        }
    }, [externalStatus, open, startRecogniser, stopRecogniser]);

    // ----- Keyboard shortcuts --------------------------------------------
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
            }
            if (e.key === " ") {
                // Space toggles pause/resume — but only when no input is
                // focused (otherwise we'd swallow real typing).
                const tag = (e.target as HTMLElement | null)?.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA") return;
                e.preventDefault();
                togglePause();
            } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const final = transcriptRef.current.trim();
                if (final) doSubmit(final);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const togglePause = () => {
        setPaused((prev) => {
            const next = !prev;
            if (next) {
                stopRecogniser();
                setStatus("paused");
            } else {
                setStatus("listening");
                startRecogniser();
            }
            return next;
        });
    };

    // ----- Render --------------------------------------------------------
    if (!mounted || !open) return null;

    const displayTranscript = transcript + (interim ? ` ${interim}` : "");
    const words = displayTranscript
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(-30);

    const statusLabel: Record<OverlayStatus, string> = {
        listening: t("voice.status.listening"),
        thinking: t("voice.status.thinking"),
        speaking: t("voice.status.speaking"),
        paused: t("voice.status.paused"),
    };

    const node = (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={t("voice.title")}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#fbf8f2]/95 backdrop-blur-xl"
            onClick={(e) => {
                // Click on the cream backdrop closes — children stopPropagation.
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 font-sans text-xs text-muted-foreground">
                <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="hover:text-foreground transition-colors"
                    title={t("voice.how.tooltip")}
                >
                    {t("voice.how")}
                </a>
                <button
                    type="button"
                    aria-label={t("voice.aria.close")}
                    onClick={onClose}
                    className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Orb */}
            <div className="relative flex items-center justify-center">
                <div
                    className={`relative w-[280px] h-[280px] rounded-full bg-gradient-to-br from-amber-100 via-[#c9a961] to-amber-700 shadow-[0_0_120px_rgba(201,169,97,0.45)] ${
                        status === "paused" ? "" : "louis-pulse"
                    }`}
                    aria-hidden="true"
                >
                    {/* Inner halo for depth */}
                    <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-amber-50/40 to-transparent" />
                    <div className="absolute inset-0 rounded-full ring-1 ring-amber-200/40" />
                </div>
            </div>

            {/* Transcript */}
            <div className="mt-10 max-w-2xl px-8 text-center font-serif text-xl text-foreground leading-relaxed min-h-[5rem]">
                {words.length === 0 ? (
                    <span className="text-muted-foreground italic">
                        {t("voice.prompt")}
                    </span>
                ) : (
                    words.map((w, i) => {
                        // Older words fade. Last word is full opacity, the
                        // 10 before it taper to opacity-30.
                        const fromEnd = words.length - 1 - i;
                        let opacity = 1;
                        if (fromEnd > 0) {
                            opacity = Math.max(0.3, 1 - fromEnd * 0.07);
                        }
                        return (
                            <span
                                key={`${i}-${w}`}
                                style={{ opacity }}
                                className="inline-block mx-1 transition-opacity duration-200"
                            >
                                {w}
                            </span>
                        );
                    })
                )}
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 pb-10">
                <div className="font-sans text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {statusLabel[status]}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={togglePause}
                        aria-label={paused ? t("voice.aria.resume") : t("voice.aria.pause")}
                        className="flex items-center gap-2 h-10 px-4 rounded-full bg-card/70 border border-amber-200 text-foreground/80 hover:bg-card transition-colors font-sans text-sm"
                    >
                        {paused ? (
                            <>
                                <Play className="h-4 w-4" /> {t("voice.resume")}
                            </>
                        ) : (
                            <>
                                <Pause className="h-4 w-4" /> {t("voice.pause")}
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const final = transcriptRef.current.trim();
                            if (final) doSubmit(final);
                        }}
                        aria-label="Send now"
                        disabled={!transcript.trim()}
                        className="flex items-center gap-2 h-10 px-4 rounded-full bg-gradient-to-b from-[#c9a961] to-amber-700 text-white hover:from-amber-600 hover:to-amber-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-sans text-sm shadow"
                    >
                        {t("action.send")} <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t("voice.aria.close")}
                        className="flex items-center gap-2 h-10 px-4 rounded-full bg-card/70 border border-border text-muted-foreground hover:bg-card transition-colors font-sans text-sm"
                    >
                        <X className="h-4 w-4" /> {t("action.close")}
                    </button>
                </div>
                <div className="font-sans text-[10px] text-muted-foreground">
                    Space pause · Enter send · Esc close
                </div>
            </div>

            {/* Floating sub-icon to remind users this IS voice mode */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <AudioLines className="h-12 w-12 text-amber-50/70" />
            </div>
        </div>
    );

    return createPortal(node, document.body);
}
