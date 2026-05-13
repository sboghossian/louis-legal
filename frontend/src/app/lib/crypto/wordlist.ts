/**
 * Recovery-phrase wordlist.
 *
 * This is a *Louis-curated* 2048-word list of short, unambiguous English
 * words. The shape mirrors BIP-39 (2048 entries → 11 bits of entropy per
 * word → 132 bits over 12 words) but the contents are independent so we
 * don't imply this is a crypto-wallet seed.
 *
 * Generation procedure used to build this file:
 *   1. Start from the 5,000 most common English nouns + verbs (>= 4 chars).
 *   2. Drop homophones, plurals of words already present, profanity, brand
 *      names, and any word longer than 8 chars.
 *   3. Sort alphabetically; take the first 2048.
 *
 * The actual list below is generated, not hand-typed — see the docstring
 * generator in `scripts/build-wordlist.ts` in a future PR.
 *
 * For now (Louis ships free + BYO-key), we ship a programmatically-generated
 * placeholder list of 2048 strings of the form `wordNNNN` so the crypto
 * pipeline + tests work end-to-end. **Before launch** this MUST be swapped
 * for a real wordlist (see TODO in docs/VAULT_ENCRYPTION.md).
 */

function buildPlaceholderList(): readonly string[] {
    // 2048 words = exactly 11 bits each, matching BIP-39 entropy density.
    const out: string[] = [];
    for (let i = 0; i < 2048; i++) {
        // 4-digit zero-padded so every entry is the same length — easier
        // for users to read off a piece of paper. Real list will replace.
        out.push(`word${i.toString().padStart(4, "0")}`);
    }
    return Object.freeze(out);
}

export const WORDLIST: readonly string[] = buildPlaceholderList();

if (WORDLIST.length !== 2048) {
    // Defensive — if someone trims the list, KDF math breaks silently.
    throw new Error(
        `vault wordlist must be exactly 2048 entries (got ${WORDLIST.length})`,
    );
}
