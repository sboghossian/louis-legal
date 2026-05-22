/**
 * Mechanical deliverable validator — no LLM, no network.
 *
 * Rejects documents that are:
 *   1. Skeleton — headings present but body content is absent/near-absent.
 *   2. Placeholder-laden — contain TODO/TBD/[...]/lorem ipsum/<placeholder>.
 *   3. Process-dump — the agent narrates its own steps ("I will now…", "Step 1: I…").
 *   4. Thin — fewer than MIN_WORD_COUNT words or fewer than MIN_SECTION_COUNT
 *      substantive sections.
 *
 * @module workflows/assembly/validate
 */

import type { ValidateDeliverable, ValidationResult } from "../contracts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum words for a deliverable to be considered substantive. */
const MIN_WORD_COUNT = 80;

/**
 * Minimum number of non-empty sections (heading + at least one body line).
 * A single-section doc might be valid for a very short memo, so threshold is 1.
 */
const MIN_SECTION_COUNT = 1;

/** Maximum ratio of heading-only lines to total lines before skeleton flag. */
const SKELETON_HEADING_RATIO = 0.5;

// ---------------------------------------------------------------------------
// Placeholder patterns
// ---------------------------------------------------------------------------

/**
 * Patterns whose presence signals placeholder / unfilled template content.
 * Case-insensitive.
 */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bT\.B\.D\b/i,
  /\[\s*\.\.\.\s*\]/,           // [...]
  /\[\s*placeholder\s*\]/i,     // [placeholder]
  /\bplaceholder\b/i,
  /lorem\s+ipsum/i,
  /<placeholder>/i,
  /\[\s*INSERT\b/i,              // [INSERT ...]
  /\[\s*FILL\b/i,                // [FILL ...]
  /\[\s*ADD\b/i,                 // [ADD ...]
];

// ---------------------------------------------------------------------------
// Process-dump patterns
// ---------------------------------------------------------------------------

/**
 * Patterns that indicate the text is narrating the agent's own workflow steps
 * rather than delivering the substantive output.
 *
 * These match common LLM "chain-of-thought leakage" patterns.
 */
const PROCESS_DUMP_PATTERNS: RegExp[] = [
  /\bI\s+will\s+now\b/i,
  /\bI\s+am\s+now\b/i,
  /\bI\s+have\s+(?:analyzed|analysed|reviewed|completed|finished)\b/i,
  /\bStep\s+\d+\s*[:–—]/i,
  /\bPhase\s+\d+\s*[:–—]/i,
  /\bAs\s+(?:an?\s+)?AI\b/i,
  /\bAs\s+(?:an?\s+)?(?:language\s+model|LLM)\b/i,
  /\bmy\s+(?:analysis|review|task|goal|objective)\s+is\s+to\b/i,
  /\bI\s+(?:will|shall)\s+(?:analyze|analyse|review|examine|identify|assess)\b/i,
  /\bfirst,?\s+I\s+(?:will|shall|am going to)\b/i,
  /\blet\s+me\s+(?:analyze|analyse|review|begin|start|now)\b/i,
  /\bIn\s+this\s+(?:analysis|review|task),?\s+I\b/i,
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Count words in a string (whitespace-separated tokens). */
function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Return true if the line looks like a Markdown or plain heading. */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  // Markdown ATX headings: # Heading
  if (/^#{1,6}\s+\S/.test(trimmed)) return true;
  // Numbered headings: "1. Title" or "1.1 Title" at line start
  if (/^\d+(?:\.\d+)*\s+\w/.test(trimmed) && trimmed.length < 120) return true;
  // ALL-CAPS short lines (typical plain-text section headers)
  if (/^[A-Z][A-Z\s\d:–—-]{3,60}$/.test(trimmed)) return true;
  return false;
}

/**
 * Check whether a document has skeleton structure — headings with no
 * meaningful body text under them.
 *
 * Returns a problem string if skeletal, or `null` if fine.
 */
function checkSkeleton(lines: string[]): string | null {
  // Count heading lines vs non-empty body lines
  let headings = 0;
  let bodyLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (isHeadingLine(trimmed)) {
      headings++;
    } else {
      bodyLines++;
    }
  }

  const totalNonEmpty = headings + bodyLines;
  if (totalNonEmpty === 0) {
    return "Document is empty.";
  }

  // If headings make up more than half of non-empty lines AND body lines are
  // very few, it's a skeleton.
  const headingRatio = headings / totalNonEmpty;
  if (headingRatio >= SKELETON_HEADING_RATIO && bodyLines < 4) {
    return `Document appears to be a skeleton: ${headings} heading(s) but only ${bodyLines} body line(s). Expected substantive content under each section.`;
  }

  // Additional check: many consecutive SAME-LEVEL headings with no body
  // between them indicates a skeleton. We only flag if there are 3+ same-level
  // consecutive headings at the TOP level (# or ##) — sub-headings (###) are
  // commonly used as sub-section titles under a parent section like
  // "## Critical Findings" and should NOT be flagged.
  let topLevelEmptyCount = 0;
  let prevWasTopHeading = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    // Only flag top-level headings (one or two #s, not sub-headings)
    const isTopHeading = /^#{1,2}\s+\S/.test(trimmed);
    if (isTopHeading) {
      if (prevWasTopHeading) topLevelEmptyCount++;
      prevWasTopHeading = true;
    } else if (isHeadingLine(trimmed)) {
      // Sub-heading — doesn't reset the top-level consecutive count
      // but also isn't body, so don't reset prevWasTopHeading
    } else {
      prevWasTopHeading = false;
    }
  }
  if (topLevelEmptyCount >= 3) {
    return `Document appears to be a skeleton: ${topLevelEmptyCount + 1} top-level sections with no body content between them.`;
  }

  return null;
}

/**
 * Count substantive sections — a section being a heading followed by at least
 * one non-empty body line.
 */
function countSections(lines: string[]): number {
  let count = 0;
  let inSection = false;
  let hasBody = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    if (isHeadingLine(trimmed)) {
      if (inSection && hasBody) count++;
      inSection = true;
      hasBody = false;
    } else {
      if (inSection) hasBody = true;
    }
  }
  // Close last section
  if (inSection && hasBody) count++;

  return count;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Mechanically validate a deliverable document. No LLM. No network.
 *
 * Rejection reasons:
 *   - Skeleton (headings without body)
 *   - Placeholder text (TODO / TBD / lorem ipsum / <placeholder> / [...])
 *   - Process-dump (agent narrating its own steps)
 *   - Thin output (below minimum word count or section count)
 *
 * @param doc - The assembled deliverable text.
 * @returns {@link ValidationResult} with `ok` and `problems[]`.
 */
export const validateDeliverable: ValidateDeliverable = (doc: string): ValidationResult => {
  const problems: string[] = [];
  const lines = doc.split(/\r?\n/);

  // --- 1. Thin: word count ---
  const words = wordCount(doc);
  if (words < MIN_WORD_COUNT) {
    problems.push(
      `Deliverable is too thin: ${words} words (minimum ${MIN_WORD_COUNT}). Output must be a complete document, not a stub.`,
    );
  }

  // --- 2. Skeleton check ---
  const skeletonProblem = checkSkeleton(lines);
  if (skeletonProblem !== null) {
    problems.push(skeletonProblem);
  }

  // --- 3. Section count (only meaningful if there ARE headings) ---
  const hasAnyHeading = lines.some((l) => isHeadingLine(l.trim()) && l.trim().length > 0);
  if (hasAnyHeading) {
    const sections = countSections(lines);
    if (sections < MIN_SECTION_COUNT) {
      problems.push(
        `Deliverable has no substantive sections (found ${sections} heading(s) with body content; minimum ${MIN_SECTION_COUNT}).`,
      );
    }
  }

  // --- 4. Placeholder patterns ---
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(doc)) {
      problems.push(
        `Deliverable contains placeholder text matching "${re.source}". All placeholders must be resolved before delivery.`,
      );
    }
  }

  // --- 5. Process-dump patterns ---
  for (const re of PROCESS_DUMP_PATTERNS) {
    if (re.test(doc)) {
      problems.push(
        `Deliverable contains process narration matching "${re.source}". Agent self-narration must be stripped; output only the substantive result.`,
      );
    }
  }

  return {
    ok: problems.length === 0,
    problems,
  };
};
