/**
 * Recovery phrase generation + reconstitution.
 *
 * A recovery phrase is 12 words drawn from a 2048-word list (see
 * `wordlist.ts`). 12 * 11 = 132 bits — comfortably above the 128-bit
 * symmetric-security floor, with a small slack used for a checksum byte.
 *
 * Encoding (matches BIP-39-style layout, simplified):
 *   - 128 bits of entropy from crypto.getRandomValues
 *   - 4-bit checksum = first nibble of SHA-256(entropy)
 *   - concatenate (132 bits) → split into 12 * 11-bit indices into WORDLIST
 *
 * The recovery phrase is fed into `kdf.deriveKey` as a passphrase (joined by
 * single spaces) and produces an alternate KEK. We store an additional
 * recovery-wrapped copy of each user's KEK so that knowing the phrase is
 * sufficient to recover access.
 */

import { WORDLIST } from "./wordlist";
import { stringToBytes } from "./base64";

const PHRASE_WORDS = 12;
const ENTROPY_BYTES = 16; // 128 bits

/** Generate a fresh 12-word recovery phrase. */
export async function generateRecoveryPhrase(): Promise<string[]> {
    const entropy = new Uint8Array(ENTROPY_BYTES);
    crypto.getRandomValues(entropy);

    // 4-bit checksum from SHA-256(entropy)
    const hash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", entropy as BufferSource),
    );
    const checksumNibble = hash[0] >> 4; // top 4 bits

    // Build a 132-bit big-endian bigint: entropy << 4 | checksum.
    // NOTE: we use BigInt(...) constructor calls rather than `0n` literals
    // because Louis's tsconfig targets ES2017 and bigint literals require
    // ES2020+. The runtime is fine — `lib` includes `esnext`.
    const ZERO = BigInt(0);
    const EIGHT = BigInt(8);
    const FOUR = BigInt(4);
    const ELEVEN = BigInt(11);
    const MASK_11 = BigInt(0x7ff);

    let bits = ZERO;
    for (const b of entropy) {
        bits = (bits << EIGHT) | BigInt(b);
    }
    bits = (bits << FOUR) | BigInt(checksumNibble);

    // Split into 12 * 11-bit indices, most-significant chunk first.
    const words: string[] = [];
    for (let i = PHRASE_WORDS - 1; i >= 0; i--) {
        const idx = Number((bits >> (BigInt(i) * ELEVEN)) & MASK_11);
        words.push(WORDLIST[idx]);
    }
    return words;
}

/**
 * Validate a recovery phrase: returns true iff it parses and the checksum
 * matches. Lets the UI tell "wrong words" from "wrong KEK" before the user
 * waits 600,000 PBKDF2 iterations.
 */
export async function validateRecoveryPhrase(words: string[]): Promise<boolean> {
    if (words.length !== PHRASE_WORDS) return false;

    const ZERO = BigInt(0);
    const EIGHT = BigInt(8);
    const FOUR = BigInt(4);
    const ELEVEN = BigInt(11);
    const MASK_4 = BigInt(0xf);
    const MASK_8 = BigInt(0xff);

    let bits = ZERO;
    for (const w of words) {
        const idx = WORDLIST.indexOf(w);
        if (idx < 0) return false;
        bits = (bits << ELEVEN) | BigInt(idx);
    }

    // Pop the 4-bit checksum.
    const checksumNibble = Number(bits & MASK_4);
    bits = bits >> FOUR;

    // Re-extract the 128 bits of entropy, most-significant byte first.
    const entropy = new Uint8Array(ENTROPY_BYTES);
    for (let i = ENTROPY_BYTES - 1; i >= 0; i--) {
        entropy[i] = Number(bits & MASK_8);
        bits = bits >> EIGHT;
    }

    const hash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", entropy as BufferSource),
    );
    return hash[0] >> 4 === checksumNibble;
}

/**
 * Normalize a phrase string (paste from a paper backup): trim, lowercase,
 * collapse whitespace. Returns the array of words. Does NOT validate.
 */
export function normalizePhrase(input: string): string[] {
    return input
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 0);
}

/**
 * Encode a phrase for use as PBKDF2 input. We use the canonical
 * "words joined by single spaces" form so paste-with-extra-whitespace still
 * derives the same KEK as type-with-single-spaces.
 */
export function phraseToPassphraseBytes(words: string[]): Uint8Array {
    return stringToBytes(words.join(" "));
}
