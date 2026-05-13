"use client";

// Per-message text-to-speech control. Lives next to the thumbs-up /
// thumbs-down buttons under each assistant reply. Hidden in browsers
// without `speechSynthesis`.

import { useEffect, useRef, useState } from "react";
import { Volume2, Pause, Play, Square } from "lucide-react";
import { speak, type SpeakHandle } from "@/app/lib/voice/tts";
import { isSpeechSynthesisSupported } from "@/app/lib/voice/types";
import {
    isVoiceModeOpen,
    subscribeVoiceMode,
} from "@/app/lib/voice/voiceModeBus";

interface Props {
    /** Stable id — used so multiple SpeakMessage instances on a page
     *  know which one is "currently playing" and reset themselves when
     *  another one starts. */
    messageId: string;
    /** Plain-text rendition of the assistant message. The hook strips
     *  any leftover markdown before queueing the utterance. */
    text: string;
    /** When true, the component will auto-start speaking as soon as the
     *  text is non-empty. Used by VoiceModeOverlay to read replies aloud
     *  the moment they finish streaming. */
    autoPlay?: boolean;
}

// Global "which message is currently speaking" — a poor man's mutex so
// clicking play on message B cancels playback of message A and resets
// A's button state.
const activeListeners = new Set<(id: string | null) => void>();
let activeMessageId: string | null = null;
function setActive(id: string | null) {
    activeMessageId = id;
    for (const fn of activeListeners) fn(id);
}

export function SpeakMessage({ messageId, text, autoPlay = false }: Props) {
    const [supported] = useState(() => isSpeechSynthesisSupported());
    const [state, setState] = useState<"idle" | "speaking" | "paused">("idle");
    const handleRef = useRef<SpeakHandle | null>(null);
    const autoPlayedRef = useRef(false);
    // When voice-mode overlay is open, fresh assistant messages should
    // start speaking themselves. We subscribe so newly mounted instances
    // pick up the current value too.
    const [voiceModeActive, setVoiceModeActive] = useState(() =>
        isVoiceModeOpen(),
    );
    useEffect(() => {
        return subscribeVoiceMode(setVoiceModeActive);
    }, []);
    const shouldAutoPlay = autoPlay || voiceModeActive;

    // Reset to idle when a different message starts speaking.
    useEffect(() => {
        const listener = (id: string | null) => {
            if (id !== messageId && state !== "idle") {
                setState("idle");
                handleRef.current = null;
            }
        };
        activeListeners.add(listener);
        return () => {
            activeListeners.delete(listener);
        };
    }, [messageId, state]);

    // Stop speech if the component unmounts mid-utterance.
    useEffect(() => {
        return () => {
            if (activeMessageId === messageId) {
                handleRef.current?.stop();
                setActive(null);
            }
        };
    }, [messageId]);

    const start = () => {
        if (!supported || !text.trim()) return;
        const handle = speak(text, {
            onStart: () => setState("speaking"),
            onDone: () => {
                setState("idle");
                handleRef.current = null;
                if (activeMessageId === messageId) setActive(null);
            },
            onError: () => {
                setState("idle");
                handleRef.current = null;
            },
        });
        handleRef.current = handle;
        if (handle) {
            setActive(messageId);
            setState("speaking");
        }
    };

    // Auto-play once when the prop flips on with a non-empty text.
    useEffect(() => {
        if (!shouldAutoPlay || autoPlayedRef.current) return;
        if (!text.trim()) return;
        autoPlayedRef.current = true;
        start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldAutoPlay, text]);

    if (!supported) return null;

    const togglePause = () => {
        const h = handleRef.current;
        if (!h) return;
        if (state === "speaking") {
            h.pause();
            setState("paused");
        } else if (state === "paused") {
            h.resume();
            setState("speaking");
        }
    };

    const stop = () => {
        handleRef.current?.stop();
        handleRef.current = null;
        setState("idle");
        if (activeMessageId === messageId) setActive(null);
    };

    if (state === "idle") {
        return (
            <button
                className="p-1.5 rounded text-muted-foreground hover:text-foreground/80 hover:bg-muted transition-colors"
                title="Read aloud"
                onClick={start}
                aria-label="Read message aloud"
            >
                <Volume2 className="h-3.5 w-3.5" />
            </button>
        );
    }

    return (
        <div className="inline-flex items-center gap-0.5">
            <button
                className={`p-1.5 rounded transition-colors ${
                    state === "speaking"
                        ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                        : "text-muted-foreground hover:text-foreground/80 hover:bg-muted"
                }`}
                title={state === "speaking" ? "Pause" : "Resume"}
                onClick={togglePause}
                aria-label={state === "speaking" ? "Pause playback" : "Resume playback"}
            >
                {state === "speaking" ? (
                    <Pause className="h-3.5 w-3.5" />
                ) : (
                    <Play className="h-3.5 w-3.5" />
                )}
            </button>
            <button
                className="p-1.5 rounded text-muted-foreground hover:text-foreground/80 hover:bg-muted transition-colors"
                title="Stop"
                onClick={stop}
                aria-label="Stop playback"
            >
                <Square className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
