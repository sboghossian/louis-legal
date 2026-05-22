/**
 * Legal-Design ethics audit — dark-pattern detection (Louis quality suite).
 *
 * Mechanically detects the seven dark-pattern categories defined in the
 * Legal Design Plugin reference corpus (`AnttiHero/lavern`,
 * `src/knowledge/ethics-audit.ts`, Apache-2.0). Only the subset that admits
 * purely deterministic, regex/string-based detection is implemented here:
 *
 *   1. Time Pressure / Urgency language               → RED
 *   2. Default Manipulation (pre-tick / opt-out)      → RED
 *   3. Illusory Consent ("by continuing you agree")   → RED
 *   4. Asymmetric Accept / Decline phrasing           → RED
 *   5. Coercive / Shaming language                    → RED
 *   6. Legalese Wall (avg sentence length heuristic)  → YELLOW
 *   7. Information Overload (total word count + para  → YELLOW
 *      count heuristic)
 *
 * Visual-nudging (category 3 in the original) requires rendered UI context and
 * cannot be assessed from plain text; it is therefore intentionally omitted.
 *
 * Contract: ZERO LLM calls, ZERO network I/O. Pure functions.
 *
 * @module quality/ethicsAudit
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Severity of a dark-pattern finding. RED = must fix; YELLOW = should review. */
export type Severity = "RED" | "YELLOW";

/**
 * A single dark-pattern finding produced by {@link runEthicsAudit}.
 *
 * `span` is the zero-based [start, end) character range of the primary evidence
 * in the input text, when a precise anchor can be identified. YELLOW heuristic
 * findings that summarise the whole document omit `span`.
 */
export interface EthicsFinding {
  /** Which of the seven dark-pattern categories this belongs to. */
  category: string;
  /** RED = manipulative (must fix); YELLOW = problematic (should review). */
  severity: Severity;
  /** Human-readable explanation and quoted evidence. */
  evidence: string;
  /** Zero-based [start, end) character range in the source text, if applicable. */
  span?: readonly [number, number];
}

// ---------------------------------------------------------------------------
// Internal detector helpers
// ---------------------------------------------------------------------------

/**
 * Scan `text` for all matches of `re` (must have the global `g` flag).
 * Returns one finding per match.
 */
function matchAll(
  text: string,
  re: RegExp,
  category: string,
  severity: Severity,
  makeEvidence: (match: RegExpExecArray) => string,
): EthicsFinding[] {
  const findings: EthicsFinding[] = [];
  let m: RegExpExecArray | null;
  // Clone so callers can safely pass pre-defined regexes without side effects.
  const safe = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = safe.exec(text)) !== null) {
    findings.push({
      category,
      severity,
      evidence: makeEvidence(m),
      span: [m.index, m.index + m[0].length],
    });
  }
  return findings;
}

// ---------------------------------------------------------------------------
// Category 1 — Time Pressure / Urgency
// ---------------------------------------------------------------------------

/**
 * Patterns that create artificial urgency or countdown pressure in legal text.
 * Mirrors the "Time Pressure" category (Severity RED) from the Lavern corpus.
 */
const URGENCY_RE =
  /\b(offer\s+expires?|limited[\s-]time\s+offer|act\s+now|expires?\s+(?:in|on|at)|only\s+\d+\s+(?:hours?|days?|minutes?)\s+(?:left|remaining)|countdown|hurry|don[''']t\s+miss\s+out|respond\s+(?:within|by)|deadline\s+(?:is|of|expires?))\b/gi;

function detectTimePressure(text: string): EthicsFinding[] {
  return matchAll(
    text,
    URGENCY_RE,
    "Time Pressure",
    "RED",
    (m) =>
      `Urgency/countdown language found: "${m[0].trim()}". Artificial time pressure on legal consent or terms violates informed-decision principles.`,
  );
}

// ---------------------------------------------------------------------------
// Category 2 — Default Manipulation (pre-tick / opt-out)
// ---------------------------------------------------------------------------

/**
 * Indicators of pre-ticked boxes or opt-out framing in consent/agreement copy.
 * Severity RED (GDPR Art. 7 requires affirmative consent; opt-out defaults
 * fail the "unambiguous" standard).
 */
const OPT_OUT_RE =
  /\b(pre[\s-]?(?:ticked?|checked?|selected?)|by\s+default\s+(?:you\s+(?:are|will\s+be)\s+)?(?:enrolled|subscribed|opted[\s-]?in|signed\s+up)|opt[\s-]?out\s+(?:at\s+any\s+time|below|here|to\s+unsubscribe)|unless\s+you\s+(?:opt\s+out|uncheck|deselect|untick)|uncheck\s+(?:this\s+box|here|below)\s+(?:if|to)\s+(?:you\s+do\s+not|stop))\b/gi;

function detectDefaultManipulation(text: string): EthicsFinding[] {
  return matchAll(
    text,
    OPT_OUT_RE,
    "Default Manipulation",
    "RED",
    (m) =>
      `Pre-ticked/opt-out language found: "${m[0].trim()}". Consent defaults must start unchecked (GDPR Art. 7; FTC Negative Option Rule).`,
  );
}

// ---------------------------------------------------------------------------
// Category 3 — Illusory Consent ("by continuing you agree")
// ---------------------------------------------------------------------------

/**
 * "By continuing / using / accessing … you agree" patterns grant no real
 * opportunity for informed consent and are increasingly unenforceable.
 * Severity RED.
 */
const BROWSEWRAP_RE =
  /\b(by\s+(?:continuing|using|accessing|clicking|proceeding|scrolling|downloading|installing|registering|signing\s+up|your\s+(?:use|access|continued\s+use))[^.]{0,80}you\s+(?:agree|accept|consent|acknowledge))\b/gi;

function detectIllusoryConsent(text: string): EthicsFinding[] {
  return matchAll(
    text,
    BROWSEWRAP_RE,
    "Illusory Consent",
    "RED",
    (m) =>
      `"By continuing … you agree" pattern found: "${m[0].slice(0, 120).trim()}". Implied consent without an affirmative action is legally fragile and ethically problematic.`,
  );
}

// ---------------------------------------------------------------------------
// Category 4 — Asymmetric Accept / Decline phrasing
// ---------------------------------------------------------------------------

/**
 * Detects asymmetric button/link copy where acceptance is plain ("I agree",
 * "Accept") but rejection is shame-framed or hard to find ("No, I don't want
 * savings", "Decline and lose access"). Severity RED.
 *
 * Two sub-patterns:
 *   a) Shame-framed rejection: "No, I don't want …", "Decline and lose …"
 *   b) Proximity of accept + shame-flavoured decline within 200 chars.
 */
const SHAME_DECLINE_RE =
  /\b(no[,.]?\s+i\s+don[''']t\s+want|decline\s+and\s+(?:lose|forfeit|give\s+up|miss)|no\s+thanks[,.]?\s+i\s+(?:prefer|don[''']t\s+want|hate|don[''']t\s+need)|i\s+don[''']t\s+want\s+(?:to\s+save|to\s+receive|discounts?|offers?|benefits?|rewards?))\b/gi;

function detectAsymmetricPhrasing(text: string): EthicsFinding[] {
  return matchAll(
    text,
    SHAME_DECLINE_RE,
    "Asymmetric Accept/Decline Phrasing",
    "RED",
    (m) =>
      `Shame-framed decline copy found: "${m[0].trim()}". Rejection options must be as dignified and visually equivalent as acceptance.`,
  );
}

// ---------------------------------------------------------------------------
// Category 5 — Coercive / Shaming language
// ---------------------------------------------------------------------------

/**
 * Threats, guilt trips, and coercive escalation language in legal/ToS text.
 * Severity RED.
 */
const COERCIVE_RE =
  /\b(you\s+(?:will\s+(?:lose|forfeit|be\s+charged)|must\s+(?:immediately|comply\s+or))|failure\s+to\s+(?:comply|respond|pay)\s+(?:will\s+result|may\s+result)\s+in\s+(?:immediate|automatic|legal\s+action)|we\s+(?:reserve\s+the\s+right\s+to\s+(?:terminate\s+immediately|pursue\s+legal)|will\s+(?:pursue|take)\s+(?:all\s+available\s+legal|legal\s+action))|(?:criminal|civil)\s+(?:penalties|prosecution|liability)\s+(?:may|will)\s+follow|are\s+you\s+sure\s+you\s+want\s+to\s+miss\s+out)\b/gi;

function detectCoerciveLanguage(text: string): EthicsFinding[] {
  return matchAll(
    text,
    COERCIVE_RE,
    "Coercive Language",
    "RED",
    (m) =>
      `Coercive or threatening language found: "${m[0].trim()}". Language should inform users of consequences without employing fear or shame as compliance tools.`,
  );
}

// ---------------------------------------------------------------------------
// Category 6 — Legalese Wall (avg sentence length heuristic)
// ---------------------------------------------------------------------------

/** Words per sentence above which the text qualifies as a "legalese wall". */
const LEGALESE_WALL_AVG_THRESHOLD = 35;

/**
 * Splits text into sentences on `.`, `!`, `?` followed by whitespace or end-of-string,
 * skipping very short fragments (likely abbreviations or numbering).
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 4);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Detects a legalese wall: average sentence length ≥ 35 words indicates the
 * text will be incomprehensible to most readers (readability targets from the
 * Lavern plain-language corpus: consumer ≤ 18 words/sentence, enterprise ≤ 22).
 * Severity YELLOW (structural problem; does not require LLM to detect).
 */
function detectLegaleseWall(text: string): EthicsFinding[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];
  const totalWords = sentences.reduce((acc, s) => acc + countWords(s), 0);
  const avg = totalWords / sentences.length;
  if (avg < LEGALESE_WALL_AVG_THRESHOLD) return [];
  return [
    {
      category: "Information Overload",
      severity: "YELLOW",
      evidence: `Average sentence length is ${avg.toFixed(1)} words across ${sentences.length} sentences (threshold: ${LEGALESE_WALL_AVG_THRESHOLD}). Dense legalese discourages reading and may constitute an Information Overload dark pattern.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Category 7 — Information Overload (document-level heuristic)
// ---------------------------------------------------------------------------

/** Minimum word count that triggers an information-overload flag. */
const INFO_OVERLOAD_WORD_THRESHOLD = 2000;

/** Minimum paragraph count that, combined with long length, triggers the flag. */
const INFO_OVERLOAD_PARA_THRESHOLD = 15;

/**
 * Flags documents that are exceptionally long (≥ 2 000 words) AND fragmented
 * into many unnumbered or unheaded paragraphs (≥ 15), making it cognitively
 * overwhelming for a typical user. Severity YELLOW.
 */
function detectInformationOverload(text: string): EthicsFinding[] {
  const words = countWords(text);
  if (words < INFO_OVERLOAD_WORD_THRESHOLD) return [];
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length < INFO_OVERLOAD_PARA_THRESHOLD) return [];
  return [
    {
      category: "Information Overload",
      severity: "YELLOW",
      evidence: `Document contains ${words} words across ${paragraphs.length} paragraphs. At this length and fragmentation level, most users will not read the full text — a known information-overload dark pattern.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all mechanically-detectable dark-pattern checks against `text`.
 *
 * Returns an array of {@link EthicsFinding} objects ordered as:
 * RED findings first (urgency → opt-out → illusory-consent → asymmetric →
 * coercive), then YELLOW findings (legalese wall → info overload).
 *
 * An empty array means no dark patterns were detected by the deterministic
 * checks — it does NOT mean the document is ethically sound. Always combine
 * with an LLM-assisted qualitative review for final clearance.
 *
 * @param text - The plain-text content of the legal document or UI copy.
 * @returns Array of {@link EthicsFinding}, possibly empty.
 */
export function runEthicsAudit(text: string): EthicsFinding[] {
  return [
    ...detectTimePressure(text),
    ...detectDefaultManipulation(text),
    ...detectIllusoryConsent(text),
    ...detectAsymmetricPhrasing(text),
    ...detectCoerciveLanguage(text),
    ...detectLegaleseWall(text),
    ...detectInformationOverload(text),
  ];
}
