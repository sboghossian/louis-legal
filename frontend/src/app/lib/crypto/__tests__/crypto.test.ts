/**
 * Vault crypto tests.
 *
 * STATUS: TODO — Louis does not yet have a test runner (no jest / vitest /
 * node:test wiring in `frontend/package.json` as of the initial E2EE commit).
 *
 * Once a runner is added, these tests should cover:
 *
 *   - `kdf.deriveKey`:
 *       - same passphrase + salt → same derived key bytes (verify by
 *         encrypt-then-decrypt round trip; raw bytes are non-extractable).
 *       - different salts produce keys that cannot decrypt each other's
 *         ciphertext.
 *       - 600,000 iterations is the parameter actually passed (spy on
 *         subtle.deriveKey).
 *
 *   - `aes.encrypt` / `aes.decrypt`:
 *       - round trip preserves plaintext for empty, 1-byte, 1-MB blobs.
 *       - flipping any bit of the ciphertext, IV, or auth tag causes
 *         decrypt to throw with the generic message (no oracle leak).
 *       - two encrypt() calls on the same plaintext + key produce different
 *         IVs (collision probability < 1 / 2^96).
 *
 *   - `wrap.generateDocumentKey` + `wrap.wrapKey` + `wrap.unwrapKey`:
 *       - wrap-then-unwrap returns a key that decrypts the same ciphertext
 *         as the original DEK.
 *       - unwrap with a wrong KEK throws.
 *       - re-wrapping the same DEK under a new KEK is sufficient to
 *         "rotate passphrase" — original document ciphertext stays valid.
 *
 *   - `recovery.generateRecoveryPhrase` + `recovery.validateRecoveryPhrase`:
 *       - 12 words drawn from WORDLIST.
 *       - validate() returns true for fresh phrases, false if any single
 *         word is tampered.
 *       - normalize() handles paste-with-tabs / mixed-case correctly.
 *
 *   - End-to-end: passphrase → KEK → DEK → ciphertext → server roundtrip
 *     stub → decrypt → identical plaintext.
 *
 * Until a runner exists, contributors should at minimum exercise these by
 * hand in DevTools using window.__louisVaultDebug (see VaultKeyContext).
 */

export {};
