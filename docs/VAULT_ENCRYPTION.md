# Vault end-to-end encryption

Status: initial implementation, frontend-only. Backend wiring + server
storage shape changes are tracked as TODOs at the bottom of this doc.

## Goal

The Vault feature already encrypts documents at rest server-side (AES-256
in the application layer, on top of whatever the storage provider does).
This document describes a second, *client-side* encryption layer stacked on
top: the user holds the key, the cloud literally cannot decrypt the
plaintext, and the existing server-side AES becomes belt-and-braces rather
than the only line of defence.

## Threat model

### Threats this addresses

- **Cloud-provider compromise.** R2 / S3 / DB breach, or storage-provider
  insider. Stolen blobs are ciphertext under a key the provider does not
  hold.
- **Louis server breach.** Even with full RCE on the application server,
  the attacker sees only ciphertext + wrapped DEKs; the KEK lives in the
  user's browser memory.
- **Insider threat at the hosting org.** Operators with DB access cannot
  read user documents. A malicious operator who modifies the served
  JavaScript can still attack future sessions, but cannot retroactively
  decrypt blobs that were uploaded under an earlier, non-malicious build
  (the KEK is never sent to the server).
- **Subpoena directed at the host.** The host cannot comply with a
  plaintext-document subpoena without coercing the user; only ciphertext
  exists at rest.

### Threats this explicitly does NOT address

- **Client compromise.** Malware on the user's machine, malicious browser
  extension, a hostile JS supply-chain attack on a Louis dependency, or a
  compromised Louis build itself. If any of these can read browser memory
  while the vault is unlocked, the KEK is exposed for the session.
- **Coerced JavaScript delivery.** A host who *replaces* the served
  Louis JS bundle can ship code that exfiltrates passphrases on next
  unlock. This is the standard "trust the host with the client code"
  problem and is inherent to web E2EE without binary signing.
- **Phishing / weak passphrase.** PBKDF2 raises the cost of an offline
  guessing attack on a stolen wrapped-DEK blob, but a 6-character
  passphrase will still be brute-forced. We enforce a 12-character
  minimum and surface the trade-off clearly in the UI.
- **Post-decryption sharing.** Once a user decrypts a document in their
  browser, they can do anything with the plaintext — including sharing
  it with Louis-the-AI via the "Allow Louis to read this" toggle. That
  is a deliberate, per-document, in-your-face user choice.
- **Side-channel attacks on the user's machine.** Cold-boot RAM
  extraction, Spectre-class browser leaks, etc. The KEK is held as a
  non-extractable `CryptoKey` to reduce the JS-visible attack surface,
  but a sufficiently determined local attacker wins.
- **Recovery-phrase loss.** If the user loses both the passphrase AND
  the recovery phrase, the data is gone. We intentionally do not keep
  a server-side backup of either.

## Crypto choices

### KDF: PBKDF2-SHA256, 600,000 iterations

- Matches OWASP 2023 password-storage recommendations for PBKDF2-SHA256.
- We chose PBKDF2 over Argon2id because Web Crypto's SubtleCrypto ships
  PBKDF2 natively in every modern browser. Argon2 would require a WASM
  dependency, which conflicts with Louis's "no new server deps, free
  product" constraint. **Decision worth confirming with Stephane:** if
  we accept a single ~50 KB WASM blob on the client (no server impact),
  we could upgrade to Argon2id, which is the modern best-in-class for
  passphrase-based KDFs.
- Iteration count is a single-call constant (`PBKDF2_ITERATIONS` in
  `frontend/src/app/lib/crypto/kdf.ts`) so it's easy to bump in one
  place.

### Symmetric: AES-256-GCM, 96-bit IV, 128-bit auth tag

- NIST SP 800-38D recommended profile.
- Fresh random IV per encryption (`crypto.getRandomValues`). Never
  reused under the same key.
- Auth tag separated from ciphertext on the wire so the payload shape
  matches the server-side AES envelope (which carries `iv` and
  `authTag` as distinct fields).

### Per-document DEK + wrap

- One AES-256 DEK per document, generated with `crypto.subtle.generateKey`.
- DEK is AES-256-GCM "wrapped" with the user's KEK (passphrase-derived).
- Rotating the passphrase re-wraps every DEK; document blobs never have
  to be touched.

### Recovery phrase: 12 words from the BIP-39 English wordlist

- 12 * 11 = 132 bits → 128 bits of entropy + 4-bit SHA-256 checksum
  (the first nibble of `SHA-256(entropy)`). Layout matches BIP-39
  exactly, which means a Louis recovery phrase is checksum-verifiable
  by any BIP-39-aware tool.
- **Wordlist: canonical BIP-39 English** (`frontend/src/app/lib/crypto/wordlist.ts`).
  Source of truth:
  `https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt`
  (public domain; SHA-256
  `2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda`).
- **Why BIP-39 over a Louis-curated list:**
  - Audited and stable since 2013; the most-attacked wordlist in
    cryptography, with no known weaknesses.
  - Recovery tooling exists in every major language (`bip39`,
    `python-mnemonic`, …), so power-users can verify backups outside
    Louis if they want belt-and-braces assurance.
  - Known-safe entropy distribution; no homophones; every word is
    uniquely determined by its first 4 characters (so a typo in the
    middle of a word still parses).
  - Building our own list would mean re-doing the audit work for no
    user-visible benefit — and getting it wrong (e.g. accidental
    homophones, or two words sharing a 4-char prefix) silently
    reduces recovery-phrase entropy.
- **Crypto-wallet association is a UX concern, not a security one.**
  We frame the phrase in the UI as a **"vault recovery phrase"**
  (never "seed phrase," never "mnemonic"), with copy that explains
  it works exactly like a paper backup of a safety-deposit-box key.
  Legal users do not need to know — and the UI does not surface —
  that the underlying list is BIP-39.

### Storage

- **KEK** is held only in browser memory as a non-extractable
  `CryptoKey`. Never written to `localStorage`. The current
  implementation also avoids writing the KEK to `sessionStorage` (only
  the salt + a setup flag are mirrored to sessionStorage as a cache).
  **Decision worth confirming:** the spec asks for
  `sessionStorage.louis.vaultKey`, but a CryptoKey cannot be
  serialized — so "cache in sessionStorage" can only ever mean
  "stash the passphrase," which we explicitly do not want to do.
  Current behavior: full re-prompt on every fresh tab. If that's too
  high-friction, the next-step alternative is the in-memory key in a
  shared SharedWorker so the key persists across the user's tabs of
  the same origin without ever hitting storage.
- **Salt** is stored server-side (canonical) and mirrored to
  `sessionStorage` for fast hydration on page open.
- **Wrapped DEKs** are stored server-side, one per document, alongside
  the (server-side-AES-encrypted) ciphertext.

## TODOs that require changes outside the agent's file scope

These are flagged here rather than touched because the agent's edit scope
is limited to the vault frontend.

1. **Backend: new envelope columns on the documents table.**
   - `e2ee_envelope_version smallint not null default 0`
   - `e2ee_ciphertext bytea`
   - `e2ee_iv bytea`, `e2ee_auth_tag bytea`
   - `e2ee_wrapped_dek bytea`, `e2ee_wrapped_dek_iv bytea`,
     `e2ee_wrapped_dek_auth_tag bytea`
   - When `envelope_version > 0`, the server's existing AES-at-rest
     pass wraps `e2ee_ciphertext` rather than the plaintext.

2. **Backend: per-user salts table.**
   - `user_id` PK, `passphrase_salt`, `recovery_salt`,
     `recovery_wrapped_kek` (so recovery-path can re-issue a KEK).
   - Salts are NOT secret but must be authentic — sign them in the JWT
     response or fetch over the user's authenticated session.

3. **Backend: skill-router awareness.**
   - The skill router must default to NOT including any document with
     `envelope_version > 0` in retrieval, unless the user has flipped
     the per-doc "Allow Louis to read this" toggle for the current
     chat session.

4. **Frontend (out of scope here): projects-page document upload flow.**
   - Wire `@/app/components/vault/encryptedDocument.ts` into the
     existing upload UI for projects that are marked as Vault
     projects.

5. **Tests: introduce a test runner.** No `jest` / `vitest` is in
   `frontend/package.json` today. See
   `frontend/src/app/lib/crypto/__tests__/crypto.test.ts` for the
   intended test surface.

## Open questions for Stephane

- PBKDF2 iteration count: stay at 600k, or upgrade to Argon2id via WASM?
- `sessionStorage` vs in-memory-only for the KEK lifetime? Current
  implementation is in-memory-only (more secure, more friction).
- Should the recovery-phrase setup screen include a confirm step where
  the user has to re-type a few random words from the phrase? (Standard
  in crypto wallets — prevents the "I'll write it down later" failure
  mode at the cost of one extra modal step.)
