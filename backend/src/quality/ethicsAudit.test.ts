/**
 * Tests for the ethics audit dark-pattern detector (Louis quality suite).
 *
 * Fixtures deliberately include realistic legal / UI copy fragments so that
 * false-positive rates can be assessed alongside detection accuracy.
 *
 * All tests are deterministic and require no LLM or network access.
 */
import { describe, it, expect } from "vitest";

import { runEthicsAudit } from "./ethicsAudit";
import type { EthicsFinding } from "./ethicsAudit";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A well-written, clean consent clause — should produce zero findings. */
const CLEAN_CLAUSE = `
This Agreement sets out the terms under which you may use our service.
Please read the following terms carefully before accepting.
You may choose to accept or decline these terms at any time.
If you decline, you may close this window without any obligation.
Your data will be handled in accordance with our Privacy Policy.
`.trim();

/** A ToS excerpt with multiple dark patterns packed together. */
const DARK_PATTERN_TOS = `
IMPORTANT NOTICE: This offer expires in 24 hours. Act now to secure your account.

By using our service, you agree to be bound by these Terms of Service.
By continuing to browse this website you agree to our cookie policy and data
collection practices.

☑ I agree to receive marketing emails and promotional offers from our partners
  (pre-ticked box — uncheck if you do not wish to receive communications)

Your subscription will renew automatically. To opt out at any time, send a
written request to our legal department at least 60 days before renewal.

Decline and lose access to all your saved documents and features.
No, I don't want to save money on my subscription.

Failure to comply with payment terms will result in immediate account termination
and we reserve the right to pursue all available legal remedies.
`.trim();

/** A legalese-wall excerpt: extremely long sentences, no dark patterns per se. */
const LEGALESE_WALL = `
Notwithstanding any other provision of this Agreement to the contrary, and subject
to the limitations and conditions set forth herein, in the event that the Customer
fails to remit payment of the applicable fees within thirty (30) calendar days of
the invoice date specified in the applicable purchase order or statement of work,
the Company shall have the right, without prejudice to any other rights or remedies
available under applicable law or equity, to suspend the Customer's access to the
platform and all associated services without further notice or liability, and such
suspension shall continue until all outstanding amounts, together with any
applicable interest accrued at the rate of one and one-half percent (1.5%) per
month on the unpaid balance, have been paid in full to the Company's reasonable
satisfaction.

The Customer hereby acknowledges and agrees that in the event of any dispute
arising out of or in connection with this Agreement, including but not limited to
disputes relating to the interpretation, validity, formation, performance, or
termination of this Agreement, the parties shall first attempt to resolve such
dispute through good-faith negotiations for a period of not less than thirty (30)
days, and failing such resolution, shall submit the dispute to binding arbitration
before a single arbitrator in accordance with the rules of the International
Chamber of Commerce, with the proceedings to be conducted in the English language
and the seat of arbitration to be Dubai International Arbitration Centre.
`.trim();

/** A large document to trigger information-overload heuristic. */
function buildBigDocument(): string {
  const para =
    "This clause describes the obligations of the parties with respect to data " +
    "security and confidentiality. Each party shall implement and maintain " +
    "reasonable safeguards consistent with industry standards.\n\n";
  // 16 paragraphs × ~35 words each ≈ ~560 words, but we also need 2000+ total words.
  // We'll repeat more aggressively.
  return Array.from({ length: 80 }, () => para).join("");
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function findingsOfCategory(findings: EthicsFinding[], category: string): EthicsFinding[] {
  return findings.filter((f) => f.category === category);
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("runEthicsAudit — clean clause", () => {
  it("returns no findings for a balanced, non-manipulative clause", () => {
    const findings = runEthicsAudit(CLEAN_CLAUSE);
    expect(findings).toHaveLength(0);
  });
});

describe("runEthicsAudit — Time Pressure (RED)", () => {
  it("flags 'offer expires in 24 hours' as RED Time Pressure", () => {
    const text = "This offer expires in 24 hours. Act now to secure your place.";
    const findings = runEthicsAudit(text);
    const tp = findingsOfCategory(findings, "Time Pressure");
    expect(tp.length).toBeGreaterThanOrEqual(1);
    expect(tp.every((f) => f.severity === "RED")).toBe(true);
  });

  it("flags 'Act now' language", () => {
    const text = "Act now — only 3 days remaining before prices increase.";
    const findings = runEthicsAudit(text);
    const tp = findingsOfCategory(findings, "Time Pressure");
    expect(tp.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag a plain deadline statement", () => {
    const text = "Invoices must be paid within 30 days.";
    const findings = runEthicsAudit(text);
    const tp = findingsOfCategory(findings, "Time Pressure");
    expect(tp).toHaveLength(0);
  });
});

describe("runEthicsAudit — Default Manipulation (RED)", () => {
  it("flags 'uncheck if you do not wish' opt-out framing", () => {
    const text =
      "☑ Receive marketing emails. Uncheck this box if you do not want to receive communications.";
    const findings = runEthicsAudit(text);
    const dm = findingsOfCategory(findings, "Default Manipulation");
    expect(dm.length).toBeGreaterThanOrEqual(1);
    expect(dm.every((f) => f.severity === "RED")).toBe(true);
  });

  it("flags 'opt out at any time' subscription auto-enrolment", () => {
    const text = "You are by default enrolled in our premium tier. You may opt out at any time.";
    const findings = runEthicsAudit(text);
    const dm = findingsOfCategory(findings, "Default Manipulation");
    expect(dm.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag an explicit opt-in instruction", () => {
    const text = "Please check the box below to confirm you wish to subscribe to our newsletter.";
    const findings = runEthicsAudit(text);
    const dm = findingsOfCategory(findings, "Default Manipulation");
    expect(dm).toHaveLength(0);
  });
});

describe("runEthicsAudit — Illusory Consent (RED)", () => {
  it("flags 'by continuing you agree' browsewrap", () => {
    const text = "By continuing to use this website you agree to our Terms of Service.";
    const findings = runEthicsAudit(text);
    const ic = findingsOfCategory(findings, "Illusory Consent");
    expect(ic.length).toBeGreaterThanOrEqual(1);
    expect(ic[0].severity).toBe("RED");
  });

  it("flags 'by using our service you accept'", () => {
    const text = "By using our service, you accept these terms without further action.";
    const findings = runEthicsAudit(text);
    const ic = findingsOfCategory(findings, "Illusory Consent");
    expect(ic.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag a proper affirmative consent instruction", () => {
    const text = "Click 'I Agree' below to accept these Terms of Service.";
    const findings = runEthicsAudit(text);
    const ic = findingsOfCategory(findings, "Illusory Consent");
    expect(ic).toHaveLength(0);
  });
});

describe("runEthicsAudit — Asymmetric Accept/Decline (RED)", () => {
  it("flags shame-framed decline copy", () => {
    const text = "No, I don't want to save money on my subscription.";
    const findings = runEthicsAudit(text);
    const aa = findingsOfCategory(findings, "Asymmetric Accept/Decline Phrasing");
    expect(aa.length).toBeGreaterThanOrEqual(1);
    expect(aa[0].severity).toBe("RED");
  });

  it("flags 'decline and lose access'", () => {
    const text = "Decline and lose access to all your saved documents.";
    const findings = runEthicsAudit(text);
    const aa = findingsOfCategory(findings, "Asymmetric Accept/Decline Phrasing");
    expect(aa.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag a neutral decline instruction", () => {
    const text = "You may decline these terms by clicking 'No, thank you'.";
    const findings = runEthicsAudit(text);
    const aa = findingsOfCategory(findings, "Asymmetric Accept/Decline Phrasing");
    expect(aa).toHaveLength(0);
  });
});

describe("runEthicsAudit — Coercive Language (RED)", () => {
  it("flags 'reserve the right to pursue all available legal remedies'", () => {
    const text =
      "Failure to comply will result in immediate termination and we reserve the right to pursue all available legal remedies.";
    const findings = runEthicsAudit(text);
    const cl = findingsOfCategory(findings, "Coercive Language");
    expect(cl.length).toBeGreaterThanOrEqual(1);
    expect(cl[0].severity).toBe("RED");
  });

  it("does not flag proportional consequence disclosure", () => {
    const text = "If payment is overdue by more than 60 days, we may refer the account to collections.";
    const findings = runEthicsAudit(text);
    const cl = findingsOfCategory(findings, "Coercive Language");
    expect(cl).toHaveLength(0);
  });
});

describe("runEthicsAudit — Legalese Wall (YELLOW)", () => {
  it("flags a document with average sentence length >= 35 words", () => {
    const findings = runEthicsAudit(LEGALESE_WALL);
    const lw = findingsOfCategory(findings, "Information Overload");
    const legalese = lw.filter((f) => f.evidence.includes("Average sentence length"));
    expect(legalese.length).toBeGreaterThanOrEqual(1);
    expect(legalese[0].severity).toBe("YELLOW");
  });

  it("does not flag a document with short, readable sentences", () => {
    const text = "We collect your name and email. We use this to send you updates. You can unsubscribe at any time.";
    const findings = runEthicsAudit(text);
    const lw = findingsOfCategory(findings, "Information Overload").filter((f) =>
      f.evidence.includes("Average sentence length"),
    );
    expect(lw).toHaveLength(0);
  });
});

describe("runEthicsAudit — Information Overload (YELLOW)", () => {
  it("flags a very long, paragraph-heavy document", () => {
    const bigDoc = buildBigDocument();
    const findings = runEthicsAudit(bigDoc);
    const io = findingsOfCategory(findings, "Information Overload").filter((f) =>
      f.evidence.includes("paragraphs"),
    );
    expect(io.length).toBeGreaterThanOrEqual(1);
    expect(io[0].severity).toBe("YELLOW");
  });
});

describe("runEthicsAudit — compound dark-pattern document", () => {
  it("detects multiple RED findings in the dark-pattern ToS fixture", () => {
    const findings = runEthicsAudit(DARK_PATTERN_TOS);
    const reds = findings.filter((f) => f.severity === "RED");
    expect(reds.length).toBeGreaterThanOrEqual(3);
  });

  it("includes Time Pressure, Default Manipulation, and Illusory Consent categories", () => {
    const findings = runEthicsAudit(DARK_PATTERN_TOS);
    const categories = new Set(findings.map((f) => f.category));
    expect(categories.has("Time Pressure")).toBe(true);
    expect(categories.has("Default Manipulation")).toBe(true);
    expect(categories.has("Illusory Consent")).toBe(true);
  });

  it("attaches character spans to all RED findings", () => {
    const findings = runEthicsAudit(DARK_PATTERN_TOS);
    const reds = findings.filter((f) => f.severity === "RED");
    // Every RED finding should have a span (they're all regex-backed)
    for (const f of reds) {
      expect(f.span).toBeDefined();
      expect(f.span![0]).toBeGreaterThanOrEqual(0);
      expect(f.span![1]).toBeGreaterThan(f.span![0]);
    }
  });
});
