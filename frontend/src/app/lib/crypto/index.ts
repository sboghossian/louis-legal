/**
 * Vault client-side crypto — barrel export.
 *
 * All vault E2EE primitives are exposed from this module. The pieces:
 *  - `aes`        — AES-256-GCM encrypt/decrypt over Uint8Array payloads.
 *  - `kdf`        — PBKDF2 passphrase → 256-bit AES key.
 *  - `wrap`       — wrap / unwrap per-document data-encryption-keys.
 *  - `recovery`   — generate + validate 12-word recovery phrases.
 *  - `base64`     — URL-safe base64 helpers for transporting binary fields.
 *
 * NOTE: All primitives are intentionally pure functions over Web Crypto.
 * They never touch storage and never log secrets. Anything that persists
 * lives in `VaultKeyContext` or vault components.
 */

export * as aes from "./aes";
export * as kdf from "./kdf";
export * as wrap from "./wrap";
export * as recovery from "./recovery";
export * as base64 from "./base64";

export type { EncryptedPayload } from "./aes";
export type { WrappedKey } from "./wrap";
