/**
 * AES-256-GCM encrypt / decrypt over arbitrary byte payloads.
 *
 * Design notes
 * ------------
 *  - GCM with a 96-bit IV is the recommended profile (NIST SP 800-38D).
 *  - We *never* reuse an IV under the same key: a fresh random IV is generated
 *    on every encrypt call. With 2^96 possible IVs, the birthday bound is far
 *    beyond what a user can produce in a session.
 *  - The 128-bit auth tag is implicit in WebCrypto: it is appended to the
 *    ciphertext bytes by `encrypt()` and consumed by `decrypt()`. We carry
 *    it through the API surface as a separate field for readability and to
 *    match the server-side payload shape, even though we recombine before
 *    handing it to SubtleCrypto.
 */

export interface EncryptedPayload {
    /** Ciphertext bytes (without the auth tag suffix). */
    ciphertext: Uint8Array;
    /** 96-bit random IV used for this single encryption. */
    iv: Uint8Array;
    /** 128-bit GCM authentication tag. */
    authTag: Uint8Array;
}

const IV_BYTES = 12; // 96 bits
const TAG_BITS = 128;
const TAG_BYTES = TAG_BITS / 8;

/** Generate a fresh random IV. Never call this with a fixed seed. */
function freshIv(): Uint8Array {
    const iv = new Uint8Array(IV_BYTES);
    crypto.getRandomValues(iv);
    return iv;
}

/**
 * Encrypt `plaintext` with `key` (AES-256-GCM).
 *
 * Returns the ciphertext, IV, and 16-byte auth tag as separate fields so the
 * caller can serialize them independently (matches server payload shape).
 */
export async function encrypt(
    plaintext: Uint8Array,
    key: CryptoKey,
): Promise<EncryptedPayload> {
    const iv = freshIv();

    const combined = new Uint8Array(
        await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv as BufferSource, tagLength: TAG_BITS },
            key,
            plaintext as BufferSource,
        ),
    );

    // SubtleCrypto returns ciphertext || authTag concatenated. Split them.
    const ciphertext = combined.subarray(0, combined.length - TAG_BYTES);
    const authTag = combined.subarray(combined.length - TAG_BYTES);

    // Copy out of subarray views so callers don't hold onto the shared buffer.
    return {
        ciphertext: new Uint8Array(ciphertext),
        iv,
        authTag: new Uint8Array(authTag),
    };
}

/**
 * Decrypt an EncryptedPayload with `key`. Throws if the auth tag fails.
 *
 * Any thrown error is converted to a generic message — we don't want to leak
 * which step (tag mismatch vs decode) failed.
 */
export async function decrypt(
    payload: EncryptedPayload,
    key: CryptoKey,
): Promise<Uint8Array> {
    const { ciphertext, iv, authTag } = payload;

    if (iv.length !== IV_BYTES) {
        throw new Error("vault decrypt: invalid IV length");
    }
    if (authTag.length !== TAG_BYTES) {
        throw new Error("vault decrypt: invalid auth tag length");
    }

    // Recombine ciphertext || authTag for SubtleCrypto.
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext, 0);
    combined.set(authTag, ciphertext.length);

    try {
        const plain = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv as BufferSource, tagLength: TAG_BITS },
            key,
            combined as BufferSource,
        );
        return new Uint8Array(plain);
    } catch {
        // Don't surface internal error details — fail closed.
        throw new Error(
            "vault decrypt: authentication failed (wrong key or tampered ciphertext)",
        );
    }
}
