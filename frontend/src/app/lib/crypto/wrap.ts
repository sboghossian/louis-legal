/**
 * Per-document Data Encryption Keys (DEK) and how we wrap them with the
 * user's Key Encryption Key (KEK).
 *
 * Why an intermediate DEK?
 * ------------------------
 * Encrypting every document directly with the user's passphrase-derived KEK
 * would mean a passphrase change forces a re-encrypt of every document blob.
 * Instead we:
 *
 *   1. Generate a fresh 256-bit AES-GCM key (the DEK) per document.
 *   2. Use the DEK to AES-256-GCM encrypt the document blob.
 *   3. Use the KEK to AES-256-GCM "wrap" the DEK (so the wrapped DEK is just
 *      a tiny ciphertext blob — ~60 bytes).
 *   4. Store on the server: wrappedDek + iv + authTag alongside the document
 *      ciphertext.
 *
 * On a passphrase change, we only re-wrap the DEKs (small + fast). The
 * document blobs themselves never have to be touched.
 */

import { encrypt, decrypt, type EncryptedPayload } from "./aes";

/**
 * A DEK wrapped under a KEK. Shape mirrors EncryptedPayload but is given a
 * distinct type to keep wrap-vs-document fields straight at call sites.
 */
export interface WrappedKey {
    wrappedKey: Uint8Array;
    iv: Uint8Array;
    authTag: Uint8Array;
}

/** Generate a fresh, extractable 256-bit AES-GCM DEK for one document. */
export async function generateDocumentKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        // extractable=true so we can wrap it. The raw bytes only leave
        // SubtleCrypto inside an AES-GCM wrap operation — never plain.
        true,
        ["encrypt", "decrypt"],
    );
}

/**
 * Wrap (encrypt) a document key under the user's KEK.
 *
 * Implementation note: we use `exportKey + encrypt` rather than
 * `subtle.wrapKey` because wrapKey returns ciphertext+tag concatenated and we
 * want the same `{ciphertext, iv, authTag}` shape we use everywhere else.
 */
export async function wrapKey(
    dek: CryptoKey,
    kek: CryptoKey,
): Promise<WrappedKey> {
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", dek));
    const payload = await encrypt(raw, kek);
    // Best-effort wipe of the exported raw bytes — JS can't guarantee
    // erasure, but zeroing the only reference we hold reduces the window.
    raw.fill(0);
    return {
        wrappedKey: payload.ciphertext,
        iv: payload.iv,
        authTag: payload.authTag,
    };
}

/**
 * Unwrap (decrypt) a wrapped DEK under the user's KEK.
 *
 * The imported CryptoKey is `extractable: true` so it can be re-wrapped on
 * passphrase rotation. If you only need to use the key for a single
 * decrypt, that's fine — the raw bytes never leave SubtleCrypto.
 */
export async function unwrapKey(
    wrapped: WrappedKey,
    kek: CryptoKey,
): Promise<CryptoKey> {
    const payload: EncryptedPayload = {
        ciphertext: wrapped.wrappedKey,
        iv: wrapped.iv,
        authTag: wrapped.authTag,
    };
    const raw = await decrypt(payload, kek);
    try {
        return await crypto.subtle.importKey(
            "raw",
            raw as BufferSource,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"],
        );
    } finally {
        // Wipe the raw key bytes after import.
        raw.fill(0);
    }
}
