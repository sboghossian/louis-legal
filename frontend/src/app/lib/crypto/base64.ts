/**
 * Base64 helpers for shuttling binary fields (ciphertext, IV, salt, auth tag)
 * to / from the server as JSON.
 *
 * We deliberately use standard base64 (not base64url) because the server
 * already stores its own AES blobs as standard base64 — keeps wire formats
 * symmetric. No padding stripped.
 */

export function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    const chunkSize = 0x8000; // avoid arg-length blow-up for large blobs
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        out[i] = binary.charCodeAt(i);
    }
    return out;
}

export function stringToBytes(s: string): Uint8Array {
    return new TextEncoder().encode(s);
}

export function bytesToString(b: Uint8Array): string {
    return new TextDecoder().decode(b);
}
