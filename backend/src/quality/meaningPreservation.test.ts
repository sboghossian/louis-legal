/**
 * Tests for the meaning-preservation diff analyser (Louis quality suite).
 *
 * All tests are deterministic — no LLM, no network. Fixtures use realistic
 * legal-text fragments to validate flag detection and absence.
 */
import { describe, it, expect } from "vitest";

import { diffRiskFlags, MEANING_PRESERVATION_PROTOCOL } from "./meaningPreservation";
import type { RiskFlag } from "./meaningPreservation";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Original SaaS MSA excerpt with multiple preservation-critical tokens. */
const ORIGINAL_MSA = `
This Master Services Agreement ("Agreement") is entered into between Acme Corp Ltd
("Company") and Beta Solutions Inc ("Customer").

The Company shall indemnify and hold harmless the Customer against any and all
claims arising out of the Company's breach, subject to a liability cap of
USD 50,000 per incident.

Payment is due within 30 days of invoice. Late payments accrue interest at
1.5% per month. The initial term is 12 months, renewable annually.

This Agreement is governed by the laws of the Dubai International Financial Centre
(DIFC) and each party submits to the exclusive jurisdiction of the DIFC Courts.
All disputes shall be resolved in accordance with GDPR Article 17 obligations
where personal data is involved.
`.trim();

/** Good simplification: same substance, plain language, key tokens preserved. */
const SIMPLIFIED_GOOD = `
This Agreement is between Acme Corp Ltd (Company) and Beta Solutions Inc (Customer).

The Company will protect Customer against claims from the Company's mistakes,
up to USD 50,000 per incident.

Pay within 30 days of your invoice. Late payments add 1.5% per month.
The contract runs for 12 months and renews each year.

UAE DIFC law governs this Agreement. The DIFC Courts handle any disputes.
GDPR Article 17 applies to personal data requests.
`.trim();

/** Bad simplification: drops amounts, terms, and regulatory references. */
const SIMPLIFIED_BAD = `
This Agreement is between the Company and the Client.

The Company will try to help if something goes wrong.

Pay on time. Late payments may incur interest.
The contract has a fixed term that renews automatically.

Local law governs. Disputes go to court.
`.trim();

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function flagsOfCategory(flags: RiskFlag[], category: string): RiskFlag[] {
  return flags.filter((f) => f.category === category);
}

// ---------------------------------------------------------------------------
// Good simplification — minimal flags
// ---------------------------------------------------------------------------

describe("diffRiskFlags — good simplification", () => {
  it("produces no CRITICAL flags when key numbers are preserved", () => {
    const flags = diffRiskFlags(ORIGINAL_MSA, SIMPLIFIED_GOOD);
    const criticals = flags.filter((f) => f.risk === "CRITICAL");
    expect(criticals).toHaveLength(0);
  });

  it("produces few or no flags overall", () => {
    const flags = diffRiskFlags(ORIGINAL_MSA, SIMPLIFIED_GOOD);
    // A very good simplification may have a small number of REVIEW flags
    // for stylistic changes, but nothing major.
    expect(flags.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Bad simplification — multiple CRITICAL flags
// ---------------------------------------------------------------------------

describe("diffRiskFlags — bad simplification", () => {
  it("flags the dropped liability cap amount", () => {
    const flags = diffRiskFlags(ORIGINAL_MSA, SIMPLIFIED_BAD);
    const numFlags = flagsOfCategory(flags, "Number / Amount Dropped");
    expect(numFlags.length).toBeGreaterThan(0);
    const hasCap = numFlags.some((f) => f.droppedToken.includes("50,000") || f.droppedToken.includes("50000"));
    expect(hasCap).toBe(true);
  });

  it("flags the dropped GDPR reference", () => {
    const flags = diffRiskFlags(ORIGINAL_MSA, SIMPLIFIED_BAD);
    const regFlags = flagsOfCategory(flags, "Regulatory Reference Dropped");
    expect(regFlags.length).toBeGreaterThan(0);
    expect(regFlags.some((f) => f.droppedToken.toLowerCase().includes("gdpr"))).toBe(true);
  });

  it("flags as CRITICAL when monetary amounts are dropped", () => {
    const flags = diffRiskFlags(ORIGINAL_MSA, SIMPLIFIED_BAD);
    const criticals = flags.filter((f) => f.risk === "CRITICAL");
    expect(criticals.length).toBeGreaterThan(0);
  });

  it("flags the dropped 30 day payment period", () => {
    const flags = diffRiskFlags(ORIGINAL_MSA, SIMPLIFIED_BAD);
    const numFlags = flagsOfCategory(flags, "Number / Amount Dropped");
    const hasPeriod = numFlags.some((f) => f.droppedToken.includes("30 day"));
    expect(hasPeriod).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Identical texts — no flags
// ---------------------------------------------------------------------------

describe("diffRiskFlags — identical texts", () => {
  it("returns no flags when original and simplified are the same", () => {
    const flags = diffRiskFlags(ORIGINAL_MSA, ORIGINAL_MSA);
    expect(flags).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Minimal originals — no false positives on empty / short text
// ---------------------------------------------------------------------------

describe("diffRiskFlags — edge cases", () => {
  it("returns no flags for empty strings", () => {
    expect(diffRiskFlags("", "")).toHaveLength(0);
  });

  it("returns no flags when simplified omits nothing of significance", () => {
    const original = "The parties agree to cooperate in good faith.";
    const simplified = "Both parties will work together honestly.";
    const flags = diffRiskFlags(original, simplified);
    // No defined terms, no numbers, no regulatory refs — expect zero flags.
    expect(flags).toHaveLength(0);
  });

  it("flags a dropped party name", () => {
    const original =
      'This NDA is between Acme Corp Ltd ("Company") and Beta Solutions Inc ("Customer"). Company shall not disclose any information.';
    const simplified = "You shall not disclose any information to third parties.";
    const flags = diffRiskFlags(original, simplified);
    const partyFlags = flagsOfCategory(flags, "Party Name Dropped");
    expect(partyFlags.length).toBeGreaterThan(0);
  });

  it("flags a dropped defined term", () => {
    const original =
      '"Confidential Information" means any non-public data shared under this Agreement. Confidential Information must not be disclosed.';
    const simplified = "Private data shared under this Agreement must not be disclosed.";
    const flags = diffRiskFlags(original, simplified);
    const termFlags = flagsOfCategory(flags, "Defined Term Dropped");
    expect(termFlags.length).toBeGreaterThan(0);
    expect(termFlags.some((f) => f.droppedToken === "confidential information")).toBe(true);
  });

  it("flags a dropped CCPA reference", () => {
    const original = "Your rights under CCPA include the right to opt out of the sale of your data.";
    const simplified = "You can ask us not to sell your data.";
    const flags = diffRiskFlags(original, simplified);
    const regFlags = flagsOfCategory(flags, "Regulatory Reference Dropped");
    expect(regFlags.some((f) => f.droppedToken.toLowerCase().includes("ccpa"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Prompt-pack export
// ---------------------------------------------------------------------------

describe("MEANING_PRESERVATION_PROTOCOL", () => {
  it("is a non-empty string", () => {
    expect(typeof MEANING_PRESERVATION_PROTOCOL).toBe("string");
    expect(MEANING_PRESERVATION_PROTOCOL.length).toBeGreaterThan(200);
  });

  it("contains the dual-artifact rule", () => {
    expect(MEANING_PRESERVATION_PROTOCOL).toContain("Dual-Artifact Rule");
  });

  it("contains the five legal meaning checkpoints", () => {
    expect(MEANING_PRESERVATION_PROTOCOL).toContain("Five Legal Meaning Checkpoints");
  });

  it("contains the non-negotiables checklist", () => {
    expect(MEANING_PRESERVATION_PROTOCOL).toContain("Non-Negotiables");
  });

  it("contains escalation rules", () => {
    expect(MEANING_PRESERVATION_PROTOCOL).toContain("Escalation Rules");
  });
});
