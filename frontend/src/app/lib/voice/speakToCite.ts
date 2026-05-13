// Tiny regex-based voice-command detector. The overlay feeds final
// transcripts through this before forwarding them to the chat — if a
// recognised command is found we return a structured action and the
// overlay handles it directly (adjust TTS rate, inject a focused
// retrieval query, etc.) instead of sending the raw words to the model.
//
// Detection is intentionally permissive — speech recognition mangles
// punctuation and casing, so we lowercase + collapse whitespace before
// matching.

export type VoiceCommand =
    | { type: "cite"; query: string }
    | { type: "page"; page: number }
    | { type: "rate"; delta: number }
    | null;

function normalise(input: string): string {
    return input
        .toLowerCase()
        .replace(/[.!?,;:]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Detect inline voice-mode commands.
 *
 * Returns `{ type: "cite", query }` when the user asks Louis to surface
 * citations for the rest of the phrase ("cite that … in the contract").
 *
 * Returns `{ type: "page", page }` when the user names a specific page
 * ("show me page 14", "go to page seven").
 *
 * Returns `{ type: "rate", delta }` for playback-speed adjustments —
 * delta is added to the saved TTS rate, clamped 0.5 – 2.0 by the caller.
 */
export function detectVoiceCommand(transcript: string): VoiceCommand {
    const t = normalise(transcript);
    if (!t) return null;

    // --- Playback-speed adjustments --------------------------------------
    // Match these first since they're short and very specific.
    if (/\b(louder|speak up|volume up)\b/.test(t)) {
        // Web Speech volume is 0-1 — we use rate as a proxy for "speak more
        // emphatically" so louder/quieter map to faster/slower for now.
        // Actual volume is harder to expose because OS-level audio governs it.
        return { type: "rate", delta: 0 };
    }
    if (/\b(faster|speed up|hurry up)\b/.test(t)) {
        return { type: "rate", delta: 0.2 };
    }
    if (/\b(slower|slow down|take your time)\b/.test(t)) {
        return { type: "rate", delta: -0.2 };
    }

    // --- Page jumps ------------------------------------------------------
    // "show me page 14", "go to page seven", "open page 3".
    const pageMatch = t.match(
        /\b(?:show me |go to |open |jump to |turn to )?page (\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/,
    );
    if (pageMatch) {
        const raw = pageMatch[1];
        const wordMap: Record<string, number> = {
            one: 1, two: 2, three: 3, four: 4, five: 5,
            six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        };
        const page = /^\d+$/.test(raw) ? parseInt(raw, 10) : wordMap[raw];
        if (page) return { type: "page", page };
    }

    // --- Speak-to-cite ---------------------------------------------------
    // "cite that", "find that in the lease", "where does it say X".
    // We strip the leading command words and forward the rest as a
    // focused retrieval query.
    const citeMatch = t.match(
        /^(?:cite (?:that|this)|find (?:that|this) in|where does it say|where in the (?:contract|document) (?:does it say|is)|show me where)\s*(.*)$/,
    );
    if (citeMatch) {
        const query = citeMatch[1].trim();
        return { type: "cite", query: query || transcript.trim() };
    }

    return null;
}

/**
 * Heuristic — does this transcript end mid-sentence?
 *
 * Web Speech API rarely emits punctuation, so we treat absence of a
 * terminator as "still speaking" and presence as a strong hint that the
 * user finished their thought. The overlay uses this together with a
 * silence timer to decide whether to auto-submit.
 */
export function endsMidSentence(transcript: string): boolean {
    const trimmed = transcript.trim();
    if (!trimmed) return true;
    // Real punctuation from the recogniser is rare but treat it as a stop.
    if (/[.!?]$/.test(trimmed)) return false;
    // Very short utterances are probably still in progress.
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 4) return true;
    return true;
}
