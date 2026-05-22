/**
 * Public types for the zero-LLM grounding verifier (Processor v2, AC2).
 *
 * Deliberately self-contained: this module is decoupled from the rest of the
 * Louis app so it can be unit-tested in isolation and reused anywhere a
 * finding/citation needs to be mechanically cross-referenced against a source
 * document. No imports from other app modules, no network, no LLM.
 */

/** Source document a finding's citations are checked against. */
export interface GroundingDocument {
  /** Full plain text of the document (post-parse). */
  text: string;
  /** Optional structured section references, e.g. ["5.2", "Clause 3"]. */
  sectionRefs?: string[];
  /** Optional parsed heading strings, e.g. ["5.2 Limitation of Liability"]. */
  headings?: string[];
}

/** Input to {@link verifyGrounding}. */
export interface GroundingInput {
  /** The agent-authored finding text containing quotes and section refs. */
  findingText: string;
  /** The document those citations are claimed to come from. */
  document: GroundingDocument;
}

/** Result of a grounding check. `score` is in the inclusive range [0, 1]. */
export interface GroundingResult {
  /** (matchedQuotes + matchedRefs) / (totalQuotes + totalRefs); 1 if nothing to check. */
  score: number;
  /** Citations (quotes and refs) that were located in the document. */
  matched: string[];
  /** Citations (quotes and refs) that could NOT be located in the document. */
  unmatched: string[];
  /** Number of distinct creditable quotes extracted from the finding. */
  quotesChecked: number;
  /** Number of distinct section references extracted from the finding. */
  refsChecked: number;
}
