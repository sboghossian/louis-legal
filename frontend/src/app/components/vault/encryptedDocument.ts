/**
 * End-to-end document encrypt / decrypt orchestration.
 *
 * High-level contract:
 *
 *   prepareUpload(file, kek):
 *     1. Generate a fresh DEK.
 *     2. AES-256-GCM encrypt the file body with the DEK.
 *     3. AES-256-GCM wrap the DEK with the user's KEK.
 *     4. Return everything the server needs (all base64-encoded).
 *
 *   readDownload(payload, kek):
 *     1. Unwrap the DEK with the user's KEK.
 *     2. Decrypt the document ciphertext with the DEK.
 *     3. Return a Blob (caller chooses MIME).
 *
 * The server is expected to additionally apply its own AES at rest on the
 * `ciphertext` blob — that's transparent to this layer and matches the
 * existing pre-E2EE flow.
 */

import { aes, base64, wrap } from "@/app/lib/crypto";

export interface UploadPayload {
    /** Document ciphertext (base64). Server stores as opaque blob. */
    ciphertextB64: string;
    /** IV used for the document ciphertext (base64, 12 bytes). */
    ivB64: string;
    /** Auth tag for the document ciphertext (base64, 16 bytes). */
    authTagB64: string;
    /** Wrapped DEK (base64). */
    wrappedDekB64: string;
    /** IV used to wrap the DEK (base64, 12 bytes). */
    wrappedDekIvB64: string;
    /** Auth tag for the wrap (base64, 16 bytes). */
    wrappedDekAuthTagB64: string;
    /** Crypto envelope version — bump when we change algorithms. */
    envelopeVersion: 1;
}

export async function prepareUpload(
    file: Blob,
    kek: CryptoKey,
): Promise<UploadPayload> {
    const dek = await wrap.generateDocumentKey();

    const plaintext = new Uint8Array(await file.arrayBuffer());
    const doc = await aes.encrypt(plaintext, dek);
    const wrapped = await wrap.wrapKey(dek, kek);

    // Best-effort wipe of the plaintext array.
    plaintext.fill(0);

    return {
        ciphertextB64: base64.bytesToBase64(doc.ciphertext),
        ivB64: base64.bytesToBase64(doc.iv),
        authTagB64: base64.bytesToBase64(doc.authTag),
        wrappedDekB64: base64.bytesToBase64(wrapped.wrappedKey),
        wrappedDekIvB64: base64.bytesToBase64(wrapped.iv),
        wrappedDekAuthTagB64: base64.bytesToBase64(wrapped.authTag),
        envelopeVersion: 1,
    };
}

export async function readDownload(
    payload: UploadPayload,
    kek: CryptoKey,
    mimeType = "application/octet-stream",
): Promise<Blob> {
    if (payload.envelopeVersion !== 1) {
        throw new Error(
            `vault: unsupported envelope version ${payload.envelopeVersion}`,
        );
    }
    const dek = await wrap.unwrapKey(
        {
            wrappedKey: base64.base64ToBytes(payload.wrappedDekB64),
            iv: base64.base64ToBytes(payload.wrappedDekIvB64),
            authTag: base64.base64ToBytes(payload.wrappedDekAuthTagB64),
        },
        kek,
    );

    const plaintext = await aes.decrypt(
        {
            ciphertext: base64.base64ToBytes(payload.ciphertextB64),
            iv: base64.base64ToBytes(payload.ivB64),
            authTag: base64.base64ToBytes(payload.authTagB64),
        },
        dek,
    );

    // Wrap in a Blob with the caller-chosen MIME and return.
    return new Blob([plaintext as BlobPart], { type: mimeType });
}
