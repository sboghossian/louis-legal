// Shared types + tiny browser-API shims for the voice mode feature.
//
// The Web Speech API is still vendor-prefixed in some Chromium / Safari
// builds and TS doesn't ship a built-in type. We declare the bare-minimum
// surface we actually use so the rest of the code stays typed.

export interface VoicePrefs {
    /** Voice URI as reported by `SpeechSynthesisVoice.voiceURI`. */
    voiceURI: string | null;
    /** 0.5 – 2.0, default 1.0 */
    rate: number;
    /** 0.0 – 2.0, default 1.0 */
    pitch: number;
    /** Auto-submit silence in ms, 1000 – 3000, default 1500. */
    silenceMs: number;
    /** Master toggle. */
    enabled: boolean;
}

export const DEFAULT_VOICE_PREFS: VoicePrefs = {
    voiceURI: null,
    rate: 1.0,
    pitch: 1.0,
    silenceMs: 1500,
    enabled: true,
};

export const VOICE_PREFS_KEY = "louis.voicePrefs";

export function readVoicePrefs(): VoicePrefs {
    if (typeof window === "undefined") return DEFAULT_VOICE_PREFS;
    try {
        const raw = window.localStorage.getItem(VOICE_PREFS_KEY);
        if (!raw) return DEFAULT_VOICE_PREFS;
        const parsed = JSON.parse(raw) as Partial<VoicePrefs>;
        return { ...DEFAULT_VOICE_PREFS, ...parsed };
    } catch {
        return DEFAULT_VOICE_PREFS;
    }
}

export function writeVoicePrefs(prefs: VoicePrefs): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(prefs));
    } catch {
        // ignore quota
    }
}

// Web Speech API shims — kept loose so we don't fight vendor differences.
export interface MinimalSpeechRecognition {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: ((e: SpeechRecognitionEventLike) => void) | null;
    onerror: ((e: { error?: string }) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

export interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: ArrayLike<{
        isFinal: boolean;
        0: { transcript: string };
    }>;
}

export function getSpeechRecognitionCtor():
    | (new () => MinimalSpeechRecognition)
    | null {
    if (typeof window === "undefined") return null;
    const w = window as unknown as {
        SpeechRecognition?: new () => MinimalSpeechRecognition;
        webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
    return getSpeechRecognitionCtor() !== null;
}

export function isSpeechSynthesisSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
}
