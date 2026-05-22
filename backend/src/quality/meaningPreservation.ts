/**
 * Meaning-preservation protocol — types, prompt-pack, and diff-risk analysis
 * (Louis quality suite).
 *
 * Provides:
 *   - {@link MEANING_PRESERVATION_PROTOCOL} — prompt-pack string ported from the
 *     Lavern Legal Design Plugin corpus (`AnttiHero/lavern`,
 *     `src/knowledge/meaning-preservation.ts`, Apache-2.0). Intended for
 *     injection into an LLM's system prompt when performing a simplification
 *     pass, enforcing the dual-artifact rule and change-log requirements.
 *
 *   - {@link RiskFlag} / {@link RiskLevel} — types describing a flagged
 *     preservation concern.
 *
 *   - {@link diffRiskFlags} — pure function that compares an original legal
 *     text against its simplified counterpart and flags dropped defined terms,
 *     numbers, monetary amounts, dates, party names, and jurisdiction-specific
 *     regulatory references. ZERO LLM, ZERO network.
 *
 * @module quality/meaningPreservation
 */

// ---------------------------------------------------------------------------
// Prompt-pack (LLM pass, ported from Lavern Apache-2.0 corpus)
// ---------------------------------------------------------------------------

/**
 * Structured protocol injected into an LLM system-prompt before any legal
 * text simplification pass.
 *
 * Port of `AnttiHero/lavern` `src/knowledge/meaning-preservation.ts`
 * (Apache-2.0), reformatted for Louis's prompt-engineering conventions.
 * The dual-artifact rule, change-log format, and five legal meaning
 * checkpoints are preserved verbatim in intent.
 */
export const MEANING_PRESERVATION_PROTOCOL = `
## Meaning Preservation Protocol — Legal Simplification

### The Dual-Artifact Rule

Every simplification produces exactly TWO outputs. Never merge them.

**Artifact 1 — User-Facing Version**
Clean, plain-language document for end users. No annotations, comments, or
review markers — what the user actually reads.

**Artifact 2 — Legal Review Package**
Produced alongside Artifact 1, for legal verification only:
- Change log with risk levels (see format below)
- Ambiguity flags
- Non-negotiables checklist
- Side-by-side comparisons for every REVIEW or CRITICAL change

### Change Log Format

Document EVERY substantive change:

| # | Section | Original | Transformed | Intent | Risk |
|---|---------|----------|-------------|--------|------|
| 1 | [ref]   | [exact quote] | [new text] | [reason] | [level] |

Risk levels:
- **Low** — Cosmetic; meaning clearly preserved (e.g., "prior to" → "before").
- **REVIEW** — Potential meaning shift; legal counsel should verify.
- **CRITICAL** — Material change to rights, obligations, or consequences; MUST verify.

### Ambiguity Flag Format

When a transformation may have shifted meaning:

> **Flag [N]: [Section] — [Topic]**
> **Original**: [exact quote]
> **Transformed**: [new version]
> **Concern**: [what might have shifted]
> **Recommendation**: [what to verify]

### Non-Negotiables — Must Be Preserved Exactly

| Category       | Elements to Verify                                                  |
|----------------|---------------------------------------------------------------------|
| Amounts        | Liability caps, payment amounts, penalties, thresholds              |
| Time           | Notice periods, deadlines, cure periods, term length                |
| Jurisdiction   | Governing law, venue, arbitration terms                             |
| Mechanisms     | Dispute resolution, termination triggers, renewal terms             |
| Definitions    | Defined terms with specific legal scope                             |
| Insurance      | Coverage requirements, limits                                       |
| Compliance     | Regulatory language (GDPR, CCPA, etc.)                              |

Output a verification table:

| Element | Original Value | Preserved? | Notes |
|---------|---------------|------------|-------|

### Five Legal Meaning Checkpoints

Run these before finalising any transformation:

1. **Rights preserved** — All user rights are present; none removed.
2. **Obligations clear** — All captured; deadlines exact; consequences stated.
3. **Definitions consistent** — Terms used consistently; scope preserved.
4. **Risk allocation unchanged** — Liability caps, indemnification, insurance intact.
5. **Dispute resolution intact** — Governing law, arbitration, venue preserved.

### Escalation Rules

**Always flag for legal review (use CRITICAL risk level)**:
- Indemnification language changes
- Liability limitation modifications
- Dispute resolution term changes
- Defined terms with specific legal meanings simplified
- Any change to rights, obligations, or consequences
- Jurisdiction-specific regulatory language

**Safe without escalation (Low risk level)**:
- "Herein" → "in this agreement"
- "Prior to" → "before"
- "Notwithstanding" → "despite" (when context is clear)
- Passive to active voice (when subject is unambiguous)
- Sentence splitting (when meaning is clearly preserved)
`.trimStart();

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Risk level assigned to a preservation concern found by {@link diffRiskFlags}. */
export type RiskLevel = "Low" | "REVIEW" | "CRITICAL";

/**
 * A single meaning-preservation risk flag produced by {@link diffRiskFlags}.
 *
 * Each flag identifies a token or pattern that is present in the `original`
 * text but absent from (or materially altered in) the `simplified` text.
 */
export interface RiskFlag {
  /** Short category label describing what was dropped or altered. */
  category: string;
  /** The specific token or phrase that was dropped. */
  droppedToken: string;
  /** Assessed risk level for this omission. */
  risk: RiskLevel;
  /** Human-readable description of the concern. */
  description: string;
}

// ---------------------------------------------------------------------------
// Internal extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract all defined terms — words/phrases enclosed in double quotes or
 * starting with a capital letter followed by a parenthetical definition
 * e.g. `"Agreement"` or `Customer (as defined below)`.
 *
 * Returns unique lowercase terms.
 */
function extractDefinedTerms(text: string): ReadonlySet<string> {
  const terms = new Set<string>();

  // "Quoted defined terms"
  const quotedRe = /"([A-Z][A-Za-z\s]{1,40})"/g;
  let m: RegExpExecArray | null;
  while ((m = quotedRe.exec(text)) !== null) {
    terms.add(m[1].trim().toLowerCase());
  }

  // CapitalisedWord (as defined …) or CapitalisedWord means …
  const defRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:\(as\s+defined|means\s+)/g;
  while ((m = defRe.exec(text)) !== null) {
    terms.add(m[1].trim().toLowerCase());
  }

  return terms;
}

/**
 * Extract numeric tokens: integers, decimals, percentages, currency amounts
 * (e.g. "USD 10,000", "$500", "30%", "3.5 million").
 *
 * Returns the matched strings (not parsed values) so structural drift is
 * detectable even when the value appears to be equivalent.
 */
function extractNumbers(text: string): ReadonlySet<string> {
  const nums = new Set<string>();
  // Currency amounts: $1,000 / USD 500 / AED 10,000
  const currencyRe = /(?:USD|AED|EUR|GBP|SAR|\$|€|£)\s*[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|thousand))?/gi;
  let m: RegExpExecArray | null;
  while ((m = currencyRe.exec(text)) !== null) {
    nums.add(m[0].trim().toLowerCase());
  }
  // Standalone numbers with optional units (30 days, 60%, 12 months)
  const unitRe = /\b(\d[\d,]*(?:\.\d+)?)\s*(?:days?|months?|years?|hours?|weeks?|%|percent)\b/gi;
  while ((m = unitRe.exec(text)) !== null) {
    nums.add(m[0].trim().toLowerCase());
  }
  // Plain significant numbers (>= 4 digits, likely reference numbers / caps)
  const bigNumRe = /\b\d{4,}(?:,\d{3})*(?:\.\d+)?\b/g;
  while ((m = bigNumRe.exec(text)) !== null) {
    nums.add(m[0].trim());
  }
  return nums;
}

/**
 * Extract party names: sequences of 2–5 Title-Cased words directly followed by
 * ("Party"), ("Company"), ("Client"), ("Licensor"), etc., or the canonical
 * parties: "Company", "Customer", "Licensor", "Licensee", "Landlord", "Tenant".
 */
function extractPartyNames(text: string): ReadonlySet<string> {
  const names = new Set<string>();
  // Formal party definitions: "Acme Corp Ltd" (hereinafter "the Company")
  const formalRe =
    /\b([A-Z][a-zA-Z&.\s]{3,50})\s*\("?(?:the\s+)?(?:Company|Customer|Client|Licensor|Licensee|Landlord|Tenant|Vendor|Supplier|Employer|Employee|Contractor|Party)\b/g;
  let m: RegExpExecArray | null;
  while ((m = formalRe.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.split(/\s+/).length >= 2) names.add(name.toLowerCase());
  }
  // Standard one-word party labels that carry legal significance
  const STANDARD_PARTIES = ["company", "customer", "licensor", "licensee", "landlord", "tenant", "vendor", "employer", "contractor"] as const;
  for (const party of STANDARD_PARTIES) {
    if (new RegExp(`\\b${party}\\b`, "i").test(text)) names.add(party);
  }
  return names;
}

/**
 * Extract jurisdiction-specific regulatory references:
 * GDPR, CCPA, FTC, CPA, PDPL (KSA), UAE Data Protection Law, etc.
 */
function extractRegulatoryRefs(text: string): ReadonlySet<string> {
  const refs = new Set<string>();
  const regRe =
    /\b(GDPR|CCPA|CPRA|FCRA|FTC\s+Act?|HIPAA|PIPEDA|PDPL|Data\s+Protection\s+(?:Act|Law|Regulation)|Consumer\s+Rights\s+Act|Electronic\s+Commerce\s+(?:Act|Law|Directive)|UAE\s+(?:Data\s+Protection|Federal\s+Decree)|Article\s+\d+|Section\s+\d+(?:\.\d+)?)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = regRe.exec(text)) !== null) {
    refs.add(m[0].trim().toLowerCase());
  }
  return refs;
}

// ---------------------------------------------------------------------------
// Presence check
// ---------------------------------------------------------------------------

/**
 * Return `true` if `token` is present in `text` as a whole-word match
 * (case-insensitive).
 */
function presentIn(token: string, text: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compare an original legal text against its simplified counterpart and return
 * risk flags for anything that appears to have been dropped or materially altered.
 *
 * Checks performed (all deterministic, no LLM):
 *   1. Defined terms (quoted or parenthetically introduced) dropped from simplified text.
 *   2. Numeric tokens (amounts, percentages, time periods) dropped.
 *   3. Party names (formal or canonical) dropped.
 *   4. Regulatory references (GDPR, CCPA, UAE DPL, …) dropped.
 *
 * A flag is produced only when the token is absent from the simplified text.
 * Tokens with risk level CRITICAL are those whose omission could alter legal
 * rights, obligations, or enforceability.
 *
 * @param original   - The source legal text before simplification.
 * @param simplified - The simplified version to compare against.
 * @returns Array of {@link RiskFlag}, possibly empty.
 */
export function diffRiskFlags(original: string, simplified: string): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // 1. Defined terms
  for (const term of extractDefinedTerms(original)) {
    if (!presentIn(term, simplified)) {
      flags.push({
        category: "Defined Term Dropped",
        droppedToken: term,
        risk: "REVIEW",
        description: `Defined term "${term}" appears in the original but not in the simplified version. If this term has a specific legal scope, its absence may silently shift meaning.`,
      });
    }
  }

  // 2. Numeric tokens
  for (const num of extractNumbers(original)) {
    if (!presentIn(num, simplified)) {
      flags.push({
        category: "Number / Amount Dropped",
        droppedToken: num,
        risk: "CRITICAL",
        description: `Numeric token "${num}" (amount, period, or percentage) appears in the original but is absent from the simplified version. Dropped figures may alter payment obligations, time limits, or liability caps.`,
      });
    }
  }

  // 3. Party names
  for (const name of extractPartyNames(original)) {
    if (!presentIn(name, simplified)) {
      flags.push({
        category: "Party Name Dropped",
        droppedToken: name,
        risk: "REVIEW",
        description: `Party name "${name}" appears in the original but not in the simplified version. Ambiguous pronoun substitution may obscure who bears an obligation.`,
      });
    }
  }

  // 4. Regulatory references
  for (const ref of extractRegulatoryRefs(original)) {
    if (!presentIn(ref, simplified)) {
      flags.push({
        category: "Regulatory Reference Dropped",
        droppedToken: ref,
        risk: "CRITICAL",
        description: `Regulatory reference "${ref}" appears in the original but is absent from the simplified version. Removing regulatory citations may affect legal compliance framing and enforceability.`,
      });
    }
  }

  return flags;
}
