/**
 * Plain-language readability analyser — deterministic scoring (Louis quality suite).
 *
 * Implements a Flesch-Kincaid-grade-level approximation, passive-voice detection,
 * and a legal-jargon wordlist check — all without LLM or network calls.
 *
 * Also exports {@link PLAIN_LANGUAGE_GUIDANCE}, a prompt-pack string ported from
 * the Lavern Legal Design Plugin corpus (`AnttiHero/lavern`,
 * `src/knowledge/plain-language.ts`, Apache-2.0) for use in a future LLM
 * rewrite pass.
 *
 * Reference audience targets (from Lavern):
 *   Consumer   FK ≤ 8,  sentence ≤ 18 words, passive ≤ 10%
 *   SMB        FK ≤ 10, sentence ≤ 20 words, passive ≤ 10%
 *   Enterprise FK ≤ 12, sentence ≤ 22 words, passive ≤ 15%
 *   Employee   FK ≤ 10, sentence ≤ 20 words, passive ≤ 10%
 *
 * @module quality/plainLanguage
 */

// ---------------------------------------------------------------------------
// Prompt-pack (LLM pass, ported from Lavern Apache-2.0 corpus)
// ---------------------------------------------------------------------------

/**
 * Structured prompt pack for an LLM-assisted plain-language rewrite pass.
 *
 * Port of the guidance in `AnttiHero/lavern` `src/knowledge/plain-language.ts`
 * (Apache-2.0). Intended to be injected into a system prompt alongside the
 * source legal text; the LLM should honour every constraint listed here and
 * output the transformed document plus a change log.
 */
export const PLAIN_LANGUAGE_GUIDANCE = `
## Plain Language Transformation — Guidance for LLM Rewrite Pass

### Principles

1. Legal effect must remain IDENTICAL after transformation.
2. Write for the reader, not the lawyer.
3. Prefer examples over abstractions.
4. Use active voice and short sentences.
5. Never hide important information.

### Word Substitutions

Replace the following legalese with plain English equivalents:

| Legalese                | Plain English                            |
|-------------------------|------------------------------------------|
| Notwithstanding         | Despite / Even if                        |
| Hereinafter             | From now on / [use actual name]          |
| Shall                   | Must / Will                              |
| Prior to                | Before                                   |
| Subsequent to           | After                                    |
| In the event that       | If                                       |
| In accordance with      | Under / Following                        |
| Pursuant to             | Under / According to                     |
| With respect to         | About / Regarding                        |
| Aforementioned          | [Name the thing explicitly]              |
| Herein / hereto / hereby| In this agreement                        |
| Whereas                 | [Delete]                                 |
| Now therefore           | [Delete]                                 |
| Witnesseth              | [Delete]                                 |

### Sentence Structure Rules

| Pattern                         | Transform To                              |
|---------------------------------|-------------------------------------------|
| Multiple clauses in one sentence| One idea per sentence                     |
| Passive voice                   | Active voice (who does what)              |
| Nested conditions               | Sequential if/then statements             |
| Double negatives                | Positive statements                       |
| Wall of text                    | Headed sections                           |
| Numbered-only paragraphs        | Number + descriptive heading              |
| Buried key terms                | Front-loaded key terms                    |
| Definitions at end              | Define on first use                       |
| Cross-references                | Direct statements                         |

### Readability Targets

| Audience   | FK Grade | Max Sentence | Max Passive | Para Length   |
|------------|----------|--------------|-------------|---------------|
| Consumer   | ≤ 8      | 18 words     | < 10%       | 3–4 sentences |
| SMB        | ≤ 10     | 20 words     | < 10%       | 3–4 sentences |
| Enterprise | ≤ 12     | 22 words     | < 15%       | 4–5 sentences |
| Employee   | ≤ 10     | 20 words     | < 10%       | 3–4 sentences |

### Handling Ambiguity

When meaning is unclear:
1. Provide the most likely plain-language interpretation.
2. Mark the clause with [LEGAL REVIEW NEEDED].
3. Note the nature of the ambiguity.
4. Suggest verification with counsel.

### Quick Example

**Before**:
> Notwithstanding any other provision of this Agreement to the contrary, in the
> event that the Customer fails to remit payment of the applicable fees within
> thirty (30) calendar days of the invoice date, the Company shall have the right
> to suspend the Customer's access without further notice.

**After**:
> **Late Payment**: If you don't pay within 30 days of your invoice, we may
> suspend your access without notice.

### Output Format

Produce TWO artifacts:

**Artifact 1 — User-Facing Version**: The transformed document with no annotations.

**Artifact 2 — Change Log**: A table documenting every substantive change:

| # | Section | Original | Transformed | Intent | Risk |
|---|---------|----------|-------------|--------|------|
| 1 | [ref]   | [quote]  | [new text]  | [why]  | Low / REVIEW / CRITICAL |

Risk levels:
- **Low** — Cosmetic; meaning clearly preserved (e.g., "prior to" → "before").
- **REVIEW** — Potential meaning shift; needs legal check.
- **CRITICAL** — Significant change to rights or obligations; must verify.
`.trimStart();

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Readability score produced by {@link scoreReadability}.
 *
 * All numeric fields are rounded to two decimal places for display but stored
 * as full-precision floats internally.
 */
export interface ReadabilityScore {
  /**
   * Approximate Flesch-Kincaid Grade Level.
   *
   * Formula: 0.39 × (words/sentences) + 11.8 × (syllables/words) − 15.59
   * Clamped to [0, 18]. A score of 8 is broadly considered consumer-accessible.
   */
  gradeLevel: number;
  /**
   * Sentences whose word count exceeds 20 words (SMB/employee threshold).
   * Each entry is the trimmed sentence text.
   */
  longSentences: string[];
  /**
   * Passive-voice candidate phrases detected (heuristic: "to be" conjugates
   * followed within 4 words by a past-participle pattern). Each entry is the
   * matched phrase.
   */
  passiveHits: string[];
  /**
   * Legalese / jargon terms found in the text. Each entry is the matched term
   * (lowercased).
   */
  jargonHits: string[];
}

// ---------------------------------------------------------------------------
// Syllable counting (Flesch-Kincaid approximation)
// ---------------------------------------------------------------------------

/**
 * Counts syllables in a single word using a heuristic that handles the most
 * common English patterns. Accuracy sufficient for FK-grade-level estimation;
 * not intended for phonological precision.
 *
 * Algorithm:
 *   1. Strip non-alpha characters and lowercase.
 *   2. Count vowel groups (consecutive vowel sequences = 1 syllable each).
 *   3. Subtract silent trailing 'e'.
 *   4. Clamp to minimum 1 (every word has at least one syllable).
 */
function syllableCount(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let count = groups ? groups.length : 1;
  // Silent trailing 'e' (not 'le', not 'ee', not 'oe' at end of polysyllable)
  if (w.length > 2 && w.endsWith("e") && !w.endsWith("le") && !w.endsWith("ee")) {
    count = Math.max(1, count - 1);
  }
  return Math.max(1, count);
}

// ---------------------------------------------------------------------------
// Sentence splitting
// ---------------------------------------------------------------------------

/** Split `text` into individual sentences on terminal punctuation. */
function toSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Count words in a string. */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Passive-voice detection
// ---------------------------------------------------------------------------

/**
 * "To be" conjugates used in passive-voice constructions.
 * Extended to cover modal passive forms ("will be done", "can be taken").
 */
const TO_BE = ["is", "are", "was", "were", "be", "been", "being", "will be", "would be", "can be", "could be", "shall be", "should be", "may be", "might be", "must be"];

/**
 * Regex that matches a "to be" form followed by up to 4 optional adverbs/
 * articles and then a word ending in -ed/-en/-ied (past participle pattern).
 *
 * Heuristic: false-positive rate is acceptable for a legal readability scanner;
 * results are flagged as "candidates" rather than definitive detections.
 */
const PASSIVE_RE = new RegExp(
  `\\b(${TO_BE.join("|")})\\b(?:\\s+\\w+){0,3}\\s+\\w+(?:ed|en|ied)\\b`,
  "gi",
);

function detectPassiveVoice(text: string): string[] {
  const hits: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(PASSIVE_RE.source, PASSIVE_RE.flags);
  while ((m = re.exec(text)) !== null) {
    hits.push(m[0].trim());
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Legalese / jargon wordlist
// ---------------------------------------------------------------------------

/**
 * Core legalese terms that plain-language guidelines recommend replacing.
 * Sourced from the Lavern word-substitution table (Apache-2.0) plus common
 * additions used in MENA / common-law legal practice.
 *
 * Each entry is matched case-insensitively as a whole word or phrase.
 */
const JARGON_TERMS: readonly string[] = [
  "notwithstanding",
  "hereinafter",
  "herein",
  "hereto",
  "hereby",
  "whereas",
  "witnesseth",
  "aforementioned",
  "pursuant to",
  "in accordance with",
  "in the event that",
  "prior to",
  "subsequent to",
  "with respect to",
  "in lieu of",
  "inter alia",
  "mutatis mutandis",
  "pari passu",
  "force majeure",
  "indemnify and hold harmless",
  "without limitation",
  "including but not limited to",
  "to the fullest extent permitted by law",
  "representations and warranties",
  "time is of the essence",
  "in witness whereof",
  "now therefore",
  "good and valuable consideration",
  "the receipt and sufficiency of which",
  "successors and assigns",
  "null and void",
];

/** Build a single regex from the jargon list for efficient scanning. */
const JARGON_RE = new RegExp(
  `\\b(${JARGON_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi",
);

function detectJargon(text: string): string[] {
  const hits: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(JARGON_RE.source, JARGON_RE.flags);
  while ((m = re.exec(text)) !== null) {
    const term = m[0].toLowerCase().trim();
    if (!hits.includes(term)) hits.push(term);
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Flesch-Kincaid Grade Level
// ---------------------------------------------------------------------------

/**
 * Compute the Flesch-Kincaid Grade Level for `text`.
 *
 * Formula: FK-GL = 0.39 × ASL + 11.8 × ASW − 15.59
 *   ASL = average sentence length in words
 *   ASW = average number of syllables per word
 *
 * Result is clamped to [0, 18] (grade school → post-graduate).
 */
function fleschKincaidGrade(text: string): number {
  const sentences = toSentences(text).filter((s) => wordCount(s) >= 2);
  if (sentences.length === 0) return 0;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  const totalSyllables = words.reduce((acc, w) => acc + syllableCount(w), 0);
  const asl = words.length / sentences.length;
  const asw = totalSyllables / words.length;
  const grade = 0.39 * asl + 11.8 * asw - 15.59;
  return Math.max(0, Math.min(18, Math.round(grade * 100) / 100));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Word count above which a sentence is flagged as "long". */
const LONG_SENTENCE_THRESHOLD = 20;

/**
 * Score the readability of a legal text using deterministic heuristics.
 *
 * All checks are pure string operations — no LLM, no network.
 *
 * @param text - Plain-text legal document or clause.
 * @returns {@link ReadabilityScore} with FK grade level, long sentences,
 *   passive-voice hits, and jargon hits.
 */
export function scoreReadability(text: string): ReadabilityScore {
  const gradeLevel = fleschKincaidGrade(text);

  const longSentences = toSentences(text).filter(
    (s) => wordCount(s) > LONG_SENTENCE_THRESHOLD,
  );

  const passiveHits = detectPassiveVoice(text);
  const jargonHits = detectJargon(text);

  return { gradeLevel, longSentences, passiveHits, jargonHits };
}
