/**
 * Zero-LLM grounding verifier (Processor v2, AC2).
 *
 * Mechanically cross-references the quotes and section references claimed in a
 * finding against the source document. Pure string matching — ZERO LLM, ZERO
 * network, Node stdlib only. Answers: "Did the agent cite things that actually
 * exist in the document?"
 *
 * Adapted from the algorithm in `AnttiHero/lavern`
 * (`src/mcp/tools/grounding-verifier.ts`, Apache-2.0), reshaped into a single
 * pure function with a self-contained I/O contract. The MCP-tool wiring,
 * session/event coupling, and per-finding aggregation are intentionally dropped;
 * the core matching logic (quote extraction, section-ref detection, bounded
 * fuzzy fallback, boilerplate exclusion) is preserved.
 */

import type { GroundingInput, GroundingResult } from "./types";

/** Matches section references: "Section 5.2", "Clause 3", "Article 12", "Paragraph 4", "Part 7". */
const SECTION_REF_RE = /(?:Section|Clause|Article|Paragraph|Part)\s+(\d+(?:\.\d+)*)/gi;

/** Minimum length for a quoted span to be worth checking. */
const MIN_QUOTE_LEN = 8;

/**
 * Max chars scanned in the sliding-window fuzzy fallback. Mirrors lavern's
 * `MAX_SEARCH_WINDOW`: caps the inner loop so a pathological quote against a
 * huge document stays bounded instead of going O(n*m).
 */
const MAX_SEARCH_WINDOW = 10_000;

/** Overlap ratio at/above which a fuzzy match is credited as "found". */
const FUZZY_MATCH_THRESHOLD = 0.8;

/**
 * Common legal boilerplate. A quote whose ENTIRE content (case-insensitively,
 * trimmed) equals one of these is not credited even if present in the document,
 * because it would match virtually any contract and proves nothing. A longer
 * quote that merely *contains* one of these phrases is still credited — the
 * surrounding specifics are what make it grounding evidence.
 */
const COMMON_LEGAL_PHRASES: ReadonlySet<string> = new Set([
  "shall not be liable",
  "to the fullest extent permitted by law",
  "without limitation",
  "including but not limited to",
  "in no event shall",
  "notwithstanding anything to the contrary",
  "subject to the terms and conditions",
  "representations and warranties",
  "indemnify and hold harmless",
  "governing law",
]);

/** Extract quoted spans (>= MIN_QUOTE_LEN chars) using single and double quotes. */
function extractQuotes(text: string): string[] {
  const quotes: string[] = [];
  const patterns = [
    new RegExp(`"([^"]{${MIN_QUOTE_LEN},})"`, "g"),
    new RegExp(`'([^']{${MIN_QUOTE_LEN},})'`, "g"),
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      quotes.push(m[1]);
    }
  }
  return quotes;
}

/** Extract section reference numbers (e.g. "5.2", "3") from finding text. */
function extractSectionRefs(text: string): string[] {
  const refs: string[] = [];
  const re = new RegExp(SECTION_REF_RE.source, SECTION_REF_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    refs.push(m[1]);
  }
  return refs;
}

/** True if `quote` is EXACTLY a boilerplate phrase (so it earns no credit). */
function isBoilerplateOnly(quote: string): boolean {
  return COMMON_LEGAL_PHRASES.has(quote.toLowerCase().trim());
}

/**
 * Character-overlap ratio of `needle` against `haystack`, in [0, 1].
 *
 * Fast path: native case-insensitive substring containment => 1.0.
 * Fallback: a bounded sliding window. For very long haystacks the window is
 * anchored near the needle's first word so the scan never exceeds
 * MAX_SEARCH_WINDOW characters.
 */
function charOverlap(needle: string, haystack: string): number {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  if (n.length === 0) return 0;

  // Fast path: exact substring (native, O(n)).
  if (h.includes(n)) return 1.0;

  // Anchor + bound the search window for large documents.
  let searchText = h;
  if (h.length > MAX_SEARCH_WINDOW) {
    const firstWord = n.split(/\s+/)[0];
    const idx = firstWord ? h.indexOf(firstWord) : -1;
    if (idx < 0) return 0; // first word absent => almost certainly not present
    const windowStart = Math.max(0, idx - 2000);
    searchText = h.slice(windowStart, windowStart + MAX_SEARCH_WINDOW);
  }

  // Sliding window: best positional character overlap of needle within window.
  const minStartReach = Math.floor(n.length * 0.5);
  let best = 0;
  for (let start = 0; start <= searchText.length - minStartReach; start++) {
    let matched = 0;
    for (let i = 0; i < n.length && start + i < searchText.length; i++) {
      if (n[i] === searchText[start + i]) matched++;
    }
    if (matched > best) best = matched;
  }
  return best / n.length;
}

/** True if a quote is grounded: present in the doc AND not boilerplate-only. */
function quoteIsGrounded(quote: string, documentText: string): boolean {
  if (isBoilerplateOnly(quote)) return false;
  return charOverlap(quote, documentText) >= FUZZY_MATCH_THRESHOLD;
}

/**
 * True if a section reference number is grounded — found in the document's
 * headings/sectionRefs, or via a "Section X" / "Clause X" / "Article X" /
 * leading "X." pattern in the raw text.
 */
function refIsGrounded(
  ref: string,
  documentText: string,
  headings: readonly string[],
  sectionRefs: readonly string[],
): boolean {
  for (const heading of headings) {
    if (heading.includes(ref)) return true;
  }
  for (const sr of sectionRefs) {
    if (sr.includes(ref)) return true;
  }
  const escaped = ref.replace(/\./g, "\\.");
  const patterns = [
    new RegExp(`Section\\s+${escaped}\\b`, "i"),
    new RegExp(`Clause\\s+${escaped}\\b`, "i"),
    new RegExp(`Article\\s+${escaped}\\b`, "i"),
    new RegExp(`Paragraph\\s+${escaped}\\b`, "i"),
    new RegExp(`Part\\s+${escaped}\\b`, "i"),
    new RegExp(`^${escaped}[.\\s]`, "m"),
  ];
  return patterns.some((p) => p.test(documentText));
}

/**
 * Mechanically verify a finding's citations against its source document.
 *
 * Score = (matchedQuotes + matchedRefs) / (totalQuotes + totalRefs).
 *
 * Vacuous-truth choice: when the finding contains NO checkable citations
 * (no creditable quotes and no section refs), there is nothing to disprove, so
 * the finding is treated as grounded with score = 1. This mirrors the reference
 * algorithm ("No refs = assume grounded / general observation") and avoids
 * unfairly penalizing legitimate general observations that cite nothing.
 * Boilerplate-only quotes are excluded *before* the count, so a finding whose
 * only "quote" is boilerplate is treated as having nothing to check (score 1),
 * not as an unmatched citation.
 */
export function verifyGrounding(input: GroundingInput): GroundingResult {
  const { findingText, document } = input;
  const documentText = document.text ?? "";
  const headings = document.headings ?? [];
  const sectionRefs = document.sectionRefs ?? [];

  // Boilerplate-only quotes earn no credit and are not counted at all.
  const quotes = extractQuotes(findingText).filter((q) => !isBoilerplateOnly(q));
  const refs = extractSectionRefs(findingText);

  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const quote of quotes) {
    if (quoteIsGrounded(quote, documentText)) matched.push(quote);
    else unmatched.push(quote);
  }
  for (const ref of refs) {
    if (refIsGrounded(ref, documentText, headings, sectionRefs)) matched.push(ref);
    else unmatched.push(ref);
  }

  const total = quotes.length + refs.length;
  // Nothing checkable => vacuously grounded (see doc comment above).
  const score = total === 0 ? 1 : matched.length / total;

  return {
    score,
    matched,
    unmatched,
    quotesChecked: quotes.length,
    refsChecked: refs.length,
  };
}
