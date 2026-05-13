/**
 * Key Derivation Function — PBKDF2-SHA256.
 *
 * Used to turn a human passphrase (or recovery phrase) into a 256-bit AES key
 * suitable for wrapping per-document DEKs.
 *
 * Parameters chosen to match OWASP 2023 guidance for PBKDF2-SHA256:
 *   600,000 iterations, 16-byte random salt.
 *
 * The output key is exported as `AES-GCM`, length 256, and is marked
 * `extractable: false` so the raw bytes never leave the SubtleCrypto sandbox.
 */

import { stringToBytes } from "./base64";

/** OWASP-recommended iteration count for PBKDF2-SHA256 as of 2023+. */
export const PBKDF2_ITERATIONS = 600_000;
export const SALT_BYTES = 16;

/** Generate a fresh random salt for a new user setup. */
export function generateSalt(): Uint8Array {
    const salt = new Uint8Array(SALT_BYTES);
    crypto.getRandomValues(salt);
    return salt;
}

/**
 * Derive a 256-bit AES-GCM key from a passphrase and a salt.
 *
 * The returned CryptoKey is non-extractable and limited to wrap/unwrap +
 * encrypt/decrypt — it cannot be exfiltrated as raw bytes.
 */
export async function deriveKey(
    passphrase: string,
    salt: Uint8Array,
    iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
    if (passphrase.length === 0) {
        throw new Error("passphrase cannot be empty");
    }

    const passphraseBytes = stringToBytes(passphrase);

    // The intermediate "raw passphrase as key material" is extractable=false
    // by construction (importKey with "raw" + PBKDF2 disallows it). Good.
    const baseKey = await crypto.subtle.importKey(
        "raw",
        passphraseBytes as BufferSource,
        { name: "PBKDF2" },
        false,
        ["deriveKey"],
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as BufferSource,
            iterations,
            hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        // extractable=false — the bytes of the KEK never leave SubtleCrypto.
        false,
        ["wrapKey", "unwrapKey", "encrypt", "decrypt"],
    );
}
