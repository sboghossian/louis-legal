// Thin wrapper around `window.speechSynthesis`. Centralised here so
// SpeakMessage, VoiceModeOverlay, and the Settings "Test voice" button
// all behave the same way (and so a TTS started in one place can be
// stopped from another — speechSynthesis is a global singleton).

import { readVoicePrefs, isSpeechSynthesisSupported } from "./types";

/** Resolve `getVoices()` — Chrome populates async after `voiceschanged`. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
        if (!isSpeechSynthesisSupported()) {
            resolve([]);
            return;
        }
        const synth = window.speechSynthesis;
        const initial = synth.getVoices();
        if (initial.length > 0) {
            resolve(initial);
            return;
        }
        const handler = () => {
            synth.removeEventListener("voiceschanged", handler);
            resolve(synth.getVoices());
        };
        synth.addEventListener("voiceschanged", handler);
        // Fallback — some browsers never fire voiceschanged.
        setTimeout(() => resolve(synth.getVoices()), 500);
    });
}

export function pickDefaultVoice(
    voices: SpeechSynthesisVoice[],
    locale?: string,
): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null;
    const lang =
        locale ??
        (typeof navigator !== "undefined" ? navigator.language : "en-US");
    const langPrefix = lang.split("-")[0];
    // Prefer exact locale match, then language family, then first voice.
    return (
        voices.find((v) => v.lang === lang) ??
        voices.find((v) => v.lang.startsWith(langPrefix)) ??
        voices[0]
    );
}

export interface SpeakHandle {
    pause: () => void;
    resume: () => void;
    stop: () => void;
    /** Returns true while the underlying utterance is still active. */
    isActive: () => boolean;
}

/**
 * Speak `text` aloud with the user's saved preferences. The returned
 * handle exposes pause/resume/stop. `onDone` fires when the utterance
 * naturally finishes OR is cancelled — callers should treat both as
 * "speaker should reset to idle".
 */
export function speak(
    text: string,
    opts?: {
        onStart?: () => void;
        onDone?: () => void;
        onError?: () => void;
        rateOverride?: number;
        pitchOverride?: number;
    },
): SpeakHandle | null {
    if (!isSpeechSynthesisSupported()) return null;
    const synth = window.speechSynthesis;
    // Cancel anything already speaking — speechSynthesis queues otherwise
    // and the user expects a click to interrupt, not stack up.
    synth.cancel();

    const prefs = readVoicePrefs();
    // Strip markdown-ish noise so the TTS doesn't read out asterisks /
    // bracket syntax verbatim. We keep the original casing + punctuation.
    const cleaned = text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/_([^_]+)_/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\[(\d+(?:,\s*\d+)*)\]/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim();
    if (!cleaned) return null;

    const utter = new SpeechSynthesisUtterance(cleaned);
    utter.rate = clampRate(opts?.rateOverride ?? prefs.rate);
    utter.pitch = clampPitch(opts?.pitchOverride ?? prefs.pitch);
    if (prefs.voiceURI) {
        const v = synth.getVoices().find((voice) => voice.voiceURI === prefs.voiceURI);
        if (v) utter.voice = v;
    }

    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        opts?.onDone?.();
    };

    utter.onstart = () => opts?.onStart?.();
    utter.onend = finish;
    utter.onerror = () => {
        opts?.onError?.();
        finish();
    };

    synth.speak(utter);

    return {
        pause: () => {
            try {
                synth.pause();
            } catch {
                // Safari sometimes throws when called while not playing.
            }
        },
        resume: () => {
            try {
                synth.resume();
            } catch {
                // ignore
            }
        },
        stop: () => {
            synth.cancel();
            finish();
        },
        isActive: () => !done,
    };
}

export function clampRate(rate: number): number {
    if (!Number.isFinite(rate)) return 1;
    return Math.max(0.5, Math.min(2.0, rate));
}

export function clampPitch(pitch: number): number {
    if (!Number.isFinite(pitch)) return 1;
    return Math.max(0, Math.min(2.0, pitch));
}
