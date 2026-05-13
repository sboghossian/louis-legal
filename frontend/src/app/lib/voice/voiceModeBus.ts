// Tiny event bus so SpeakMessage (rendered inside AssistantMessage,
// deep in the chat list) can know when VoiceModeOverlay (rendered as a
// sibling of ChatInput) is open, without prop-drilling through a dozen
// components.

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
