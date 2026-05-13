// Tiny event bus so SpeakMessage (rendered inside AssistantMessage,
// deep in the chat list) can know when VoiceModeOverlay (rendered as a
// sibling of ChatInput) is open, without prop-drilling through a dozen
// components.
//
// Also publishes a "speaking" channel: SpeakMessage notifies when TTS
// starts/ends, so the ChatInput overlay status flips from
// "thinking" → "speaking" → "listening" off the real audio events
// instead of a hardcoded setTimeout.

type Listener = (open: boolean) => void;

let voiceModeOpen = false;
const listeners = new Set<Listener>();

export function setVoiceModeOpen(open: boolean): void {
    if (voiceModeOpen === open) return;
    voiceModeOpen = open;
    for (const fn of listeners) fn(open);
}

export function isVoiceModeOpen(): boolean {
    return voiceModeOpen;
}

export function subscribeVoiceMode(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

// ---------------------------------------------------------------------------
// TTS-speaking signal
// ---------------------------------------------------------------------------

let speaking = false;
const speakingListeners = new Set<Listener>();

export function setTtsSpeaking(active: boolean): void {
    if (speaking === active) return;
    speaking = active;
    for (const fn of speakingListeners) fn(active);
}

export function isTtsSpeaking(): boolean {
    return speaking;
}

export function subscribeTtsSpeaking(fn: Listener): () => void {
    speakingListeners.add(fn);
    return () => {
        speakingListeners.delete(fn);
    };
}
