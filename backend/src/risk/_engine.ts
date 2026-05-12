/**
 * Risk Scoring Engine — rule-based contract red-flag detector.
 *
 * Scans contract text for known risky patterns: unilateral termination,
 * unlimited liability, broad indemnity, missing protections, sanctions/
 * AML gaps, IP defects, data-protection misalignment, jurisdiction conflicts,
 * etc. Each rule has:
 *  - severity (P0 dealbreaker / P1 high / P2 medium / P3 nit)
 *  - category
 *  - description
 *  - remediation suggestion
 *  - linked clause-library alternative (if applicable)
 *  - jurisdictional scope
 *
 * This is *deterministic* — the regex/keyword layer. An LLM layer on top
 * may identify semantic risks (planned).
 */

export type RiskSeverity = "P0" | "P1" | "P2" | "P3";
export type RiskCategory =
  | "liability"
  | "indemnity"
  | "termination"
  | "ip"
  | "data-protection"
  | "confidentiality"
  | "non-compete"
  | "warranties"
  | "payment"
  | "force-majeure"
  | "dispute-resolution"
  | "governing-law"
  | "sanctions"
  | "anti-bribery"
  | "drafting-quality"
  | "execution"
  | "missing-clause";

export interface RiskFinding {
  ruleId: string;
  severity: RiskSeverity;
  category: RiskCategory;
  title: string;
  description: string;
  remediation: string;
  excerpt?: string;
  excerptOffset?: number;
  alternateClauseId?: string;
  jurisdictionalNotes?: string;
}

export interface RiskRule {
  id: string;
  severity: RiskSeverity;
  category: RiskCategory;
  title: string;
  description: string;
  remediation: string;
  /** Regex to match if present is BAD. */
  presenceBad?: RegExp;
  /** Regex to match if absent is BAD (i.e., expected protective clause). */
  absencePresent?: RegExp;
  jurisdictionScope?: string[];
  alternateClauseId?: string;
  jurisdictionalNotes?: string;
}

const RULES: RiskRule[] = [
  // ===================== LIABILITY =====================
  {
    id: "lol.unlimited",
    severity: "P0",
    category: "liability",
    title: "Unlimited liability — no cap present",
    description: "No limitation-of-liability clause detected, or the language explicitly states 'unlimited' or 'without limit'.",
    remediation: "Add a limitation-of-liability clause capping aggregate liability (typical: 12 months' fees or 1x annual contract value).",
    absencePresent: /limit(ation)?\s+of\s+liability|in\s+no\s+event\s+shall|aggregate\s+(cumulative\s+)?liability/i,
    alternateClauseId: "lol.cap-fees-paid",
  },
  {
    id: "lol.consequential-not-excluded",
    severity: "P1",
    category: "liability",
    title: "Consequential / indirect damages not excluded",
    description: "No exclusion of indirect, consequential, special, or punitive damages found.",
    remediation: "Add 'In no event shall either party be liable for any indirect, consequential, special, incidental, exemplary or punitive damages…' carve-out.",
    absencePresent: /indirect.{0,30}consequential|consequential.{0,30}damages|(no\s+event|under\s+no\s+circumstances)\s+(shall|will)/i,
    alternateClauseId: "lol.cap-fees-paid",
  },
  {
    id: "lol.no-carveouts",
    severity: "P1",
    category: "liability",
    title: "Liability cap with no standard carve-outs",
    description: "A liability cap is present but no carve-outs (indemnity, IP, confidentiality, gross negligence, willful misconduct, fraud) — cap may be unenforceable as too aggressive, or may unduly limit recovery.",
    remediation: "Add standard carve-outs for breach of confidentiality, IP indemnity, gross negligence, willful misconduct, fraud, and amounts owed.",
    presenceBad: /aggregate.{0,80}liability.{0,200}shall\s+not\s+exceed/i,
    // Heuristic: presence of cap but absence of carve-out keywords
  },

  // ===================== INDEMNITY =====================
  {
    id: "indem.no-cap",
    severity: "P1",
    category: "indemnity",
    title: "Indemnity obligations not capped",
    description: "Indemnity language detected but no cap on indemnification obligations.",
    remediation: "Either (a) cap indemnity at the same level as liability cap with explicit IP carve-out, or (b) keep uncapped but only for specific narrow cases (IP, confidentiality, fraud).",
    presenceBad: /indemn(if|ify|ity)/i,
  },
  {
    id: "indem.broad-hold-harmless",
    severity: "P1",
    category: "indemnity",
    title: "Overly broad 'hold harmless' indemnity",
    description: "'Hold harmless' for 'any and all' claims is exceptionally broad and may be unenforceable in some MENA jurisdictions or unconscionable in others.",
    remediation: "Narrow to specific categories: third-party IP claims, third-party personal injury, third-party data claims. Require breach + causation.",
    presenceBad: /hold\s+harmless.{0,100}(any\s+and\s+all|all)\s+(claims|losses|damages)/i,
  },

  // ===================== TERMINATION =====================
  {
    id: "term.unilateral-without-cause",
    severity: "P1",
    category: "termination",
    title: "Unilateral termination for convenience without cure",
    description: "Termination 'at any time without cause' / 'for convenience' detected. Strongly favors one side.",
    remediation: "Negotiate balanced termination rights, cure periods (30 days), and post-termination fee-tail for in-progress matters.",
    presenceBad: /terminat\w+\s+(at\s+(its|any)\s+(sole\s+)?discretion|for\s+convenience|at\s+any\s+time)\s+(by|upon|with).{0,30}(notice|writing)/i,
  },
  {
    id: "term.no-cure-period",
    severity: "P2",
    category: "termination",
    title: "Termination for breach without cure period",
    description: "Termination for breach without a notice-and-cure mechanism. Disputes over alleged breach can escalate too quickly.",
    remediation: "Add a 30-day notice-and-cure period for material breach (carve out non-payment, where 10-day cure is industry standard).",
    presenceBad: /terminat\w+\s+(this\s+agreement\s+)?(for|upon|on)\s+(breach|default)/i,
  },

  // ===================== IP =====================
  {
    id: "ip.agrees-to-assign",
    severity: "P0",
    category: "ip",
    title: "Uses 'agrees to assign' instead of 'hereby assigns' (Stanford v Roche)",
    description: "Future tense 'agrees to assign' may not effect a present assignment; Stanford v Roche v Roche held this language ineffective.",
    remediation: "Change to 'hereby irrevocably assigns and transfers' (present tense) with effective-on-creation language.",
    presenceBad: /(agrees|will|undertakes)\s+to\s+assign/i,
    alternateClauseId: "ip.work-product-customer",
  },
  {
    id: "ip.moral-rights-absent",
    severity: "P2",
    category: "ip",
    title: "Moral rights waiver missing",
    description: "Where author has moral rights (France, Lebanon, Egypt, KSA — moral rights are inalienable but can be waived in some respects), the IP clause does not address them.",
    remediation: "Add 'Service Provider waives all moral rights to the maximum extent permitted by applicable law.'",
    absencePresent: /moral\s+right/i,
    jurisdictionScope: ["FR", "LB", "EG", "KSA"],
  },

  // ===================== DATA PROTECTION =====================
  {
    id: "dp.no-dpa-personal-data",
    severity: "P0",
    category: "data-protection",
    title: "Processes personal data but no DPA addendum",
    description: "Contract mentions 'personal data', 'GDPR', 'PDPL', 'data subject' etc. but no Data Processing Addendum referenced.",
    remediation: "Annex a Data Processing Addendum covering processor obligations, sub-processors, transfer mechanism, breach notification, audit rights, return/deletion.",
    presenceBad: /personal\s+data|data\s+subject|GDPR|PDPL/i,
    alternateClauseId: "dp.dpa-gdpr-pdpl",
  },
  {
    id: "dp.cross-border-no-mechanism",
    severity: "P1",
    category: "data-protection",
    title: "Cross-border data transfer mentioned but no mechanism specified",
    description: "Reference to international transfer / cross-border processing without specifying SCC / BCR / adequacy / other safeguard.",
    remediation: "Add Standard Contractual Clauses (2021 EU SCCs) for EU exports; controller-assurance + DPIA for UAE/KSA outbound under PDPL Art. 22 / Art. 29.",
    presenceBad: /(international|cross[\s-]border)\s+transfer|(transfer.{0,30}third\s+country)/i,
  },

  // ===================== CONFIDENTIALITY =====================
  {
    id: "conf.no-confidentiality",
    severity: "P1",
    category: "confidentiality",
    title: "No confidentiality clause detected",
    description: "Contract lacks any confidentiality provision.",
    remediation: "Add mutual confidentiality clause with 5-year tail (or indefinite for trade secrets).",
    absencePresent: /confidential(ity|\s+information)/i,
    alternateClauseId: "conf.standard-mutual",
  },
  {
    id: "conf.no-exceptions",
    severity: "P2",
    category: "confidentiality",
    title: "Confidentiality clause missing standard exceptions",
    description: "Confidentiality clause without the standard exceptions (prior possession, publicly available, third-party rightful, independently developed, legal compulsion).",
    remediation: "Add the standard 4-5 exceptions to make the clause enforceable and workable.",
    presenceBad: /confidential\s+information/i,
  },

  // ===================== NON-COMPETE =====================
  {
    id: "noncompete.unbounded",
    severity: "P1",
    category: "non-compete",
    title: "Non-compete without geographic or temporal limit",
    description: "Non-compete clause lacks duration / territory / specific business limit — likely unenforceable across most jurisdictions.",
    remediation: "Add duration (UAE/KSA: max 2 yrs), geographic limit, specific industry/field. Pair with consideration.",
    presenceBad: /non[\s-]compet/i,
    alternateClauseId: "noncompete.uae-employment",
  },

  // ===================== WARRANTIES =====================
  {
    id: "warranty.disclaim-all",
    severity: "P2",
    category: "warranties",
    title: "All warranties disclaimed (including implied)",
    description: "Sweeping disclaimer of all implied warranties (merchantability, fitness for purpose, non-infringement). Customer protection minimal.",
    remediation: "Negotiate at minimum: (a) services performed in workmanlike manner per industry standards, (b) IP non-infringement warranty.",
    presenceBad: /(disclaim|exclud)\w*.{0,80}(implied\s+warrant|warranty\s+of\s+merchant|fitness\s+for|non[\s-]infringement)/i,
  },
  {
    id: "warranty.absolute-language",
    severity: "P2",
    category: "warranties",
    title: "Absolute warranty language ('will' / 'shall' instead of 'reasonable efforts')",
    description: "Absolute commitments ('the Service will be available 24/7' / 'the Software will be free of defects') create strict liability.",
    remediation: "Soften to 'commercially reasonable efforts' or 'substantially in conformity with the Documentation' for service-level claims.",
    presenceBad: /(software|service)\s+(shall|will)\s+be\s+(free\s+of|available|error[\s-]free)/i,
  },

  // ===================== PAYMENT =====================
  {
    id: "payment.no-late-fees",
    severity: "P3",
    category: "payment",
    title: "No late-payment provision",
    description: "Contract doesn't address late-payment interest or fees.",
    remediation: "Add 1.5% per month or maximum legal rate, plus collection costs.",
    absencePresent: /(late\s+(fee|charge|payment)|interest\s+on\s+overdue)/i,
  },
  {
    id: "payment.cash-currency-trap",
    severity: "P1",
    category: "payment",
    title: "Lebanese pound / volatile currency without conversion mechanism",
    description: "Contract refers to LBP, IRR, EGP, or other volatile currencies without a conversion / payment-mechanism clause.",
    remediation: "Specify currency, conversion mechanism, and source of exchange rate (BDL official / Sayrafa / etc. for Lebanon).",
    presenceBad: /(LBP|Lebanese\s+pound|Lebanese\s+lira|IRR|Iranian\s+rial)/i,
    jurisdictionScope: ["LB", "IR"],
  },

  // ===================== FORCE MAJEURE =====================
  {
    id: "fm.missing",
    severity: "P1",
    category: "force-majeure",
    title: "No force majeure clause",
    description: "Contract has no force-majeure / impossibility provision.",
    remediation: "Add a balanced FM clause covering acts of God, war, pandemic, sanctions, govt action. Exclude payment obligations from FM cover.",
    absencePresent: /force\s+majeure|(act\s+of\s+god|acts\s+of\s+god)/i,
    alternateClauseId: "fm.standard-with-pandemic",
  },
  {
    id: "fm.no-pandemic",
    severity: "P3",
    category: "force-majeure",
    title: "Force majeure clause may not cover pandemic",
    description: "Force majeure present but no explicit pandemic / epidemic / quarantine language (post-COVID standard practice).",
    remediation: "Add explicit pandemic / epidemic / quarantine to the list of FM events.",
    presenceBad: /force\s+majeure/i,
  },

  // ===================== DISPUTE RESOLUTION =====================
  {
    id: "dr.missing",
    severity: "P0",
    category: "dispute-resolution",
    title: "No dispute resolution clause",
    description: "Contract has no governing law or dispute resolution clause.",
    remediation: "Add governing law (DIFC / English / NY) and DR mechanism (DIAC / LCIA / ICC / DIFC Courts / ADGM Courts).",
    absencePresent: /(arbitration|jurisdiction|court|governing\s+law|tribunal)/i,
    alternateClauseId: "dr.diac-arbitration",
  },
  {
    id: "dr.law-forum-mismatch",
    severity: "P2",
    category: "dispute-resolution",
    title: "Possible governing-law / forum mismatch",
    description: "Governing law and forum may not match (e.g., DIFC law but onshore Dubai courts).",
    remediation: "Align governing law with supervisory courts: DIFC law + DIFC courts (or DIAC seated in DIFC); English law + LCIA London; etc.",
    presenceBad: /governing\s+law/i,
  },

  // ===================== GOVERNING LAW =====================
  {
    id: "gov.no-language-prevails",
    severity: "P2",
    category: "governing-law",
    title: "Bilingual contract without prevailing-language clause",
    description: "Bilingual mentions detected but no statement of which language prevails.",
    remediation: "Add 'In the event of any discrepancy between the [English] and [Arabic] versions, the [Arabic] version shall prevail.' (Arabic mandatory in some MENA jurisdictions.)",
    presenceBad: /(arabic|english|bilingual)\s+(version|translation)/i,
    jurisdictionScope: ["UAE", "KSA", "LB", "EG"],
  },

  // ===================== SANCTIONS =====================
  {
    id: "sanc.missing",
    severity: "P1",
    category: "sanctions",
    title: "No sanctions / OFAC clause",
    description: "Contract has no sanctions compliance representations or termination right for becoming a sanctioned party.",
    remediation: "Add multi-list sanctions clause (UN + OFAC + EU + UK + MENA national lists) with termination right.",
    absencePresent: /(sanction|OFAC|UN\s+Security\s+Council|specially\s+designated)/i,
    alternateClauseId: "sanc.standard-multi-list",
  },

  // ===================== ANTI-BRIBERY =====================
  {
    id: "ab.missing",
    severity: "P1",
    category: "anti-bribery",
    title: "No anti-bribery / FCPA clause",
    description: "Contract has no anti-bribery representations or compliance covenant.",
    remediation: "Add FCPA + UK Bribery Act + KSA Anti-Bribery Law compliance representations; books-and-records covenant; termination right.",
    absencePresent: /(anti[\s-]bribery|FCPA|Bribery\s+Act|corrupt|bribe)/i,
    alternateClauseId: "ab.fcpa-ukba-ksa",
  },

  // ===================== DRAFTING QUALITY =====================
  {
    id: "dq.tbd-placeholders",
    severity: "P0",
    category: "drafting-quality",
    title: "TBD / placeholder text remaining",
    description: "TBD / TO BE DETERMINED / TBC / [BRACKETS] left in execution-ready draft.",
    remediation: "Replace all placeholders before execution. This is the most common 'oh no' moment post-signing.",
    presenceBad: /\bTBD\b|\bTBC\b|to\s+be\s+(determined|confirmed|inserted)|\[[A-Z][A-Z\s,]+\]/,
  },
  {
    id: "dq.cross-ref",
    severity: "P2",
    category: "drafting-quality",
    title: "Possible broken cross-reference",
    description: "References to Section/Article/Clause X.Y detected — verify all targets exist.",
    remediation: "Run cross-reference integrity check (see review.cross-reference-integrity skill).",
    presenceBad: /(Section|Article|Clause|Sch)\s+\d+(\.\d+){0,2}/,
  },

  // ===================== EXECUTION =====================
  {
    id: "exec.no-signature-block",
    severity: "P1",
    category: "execution",
    title: "No signature block detected",
    description: "Signature block / 'IN WITNESS WHEREOF' / counterparts clause missing or incomplete.",
    remediation: "Add signature blocks, witness blocks (UAE: 2 witnesses for some commercial docs), notarization layer if required, counterparts clause.",
    absencePresent: /(IN\s+WITNESS\s+WHEREOF|signed.{0,30}duly\s+authoris|signature\s+block)/i,
  },

  // ===================== MISSING CLAUSES =====================
  {
    id: "missing.assignment",
    severity: "P2",
    category: "missing-clause",
    title: "No assignment / change-of-control clause",
    description: "Contract doesn't address assignment or change of control of either party.",
    remediation: "Add: neither party may assign without prior written consent (not unreasonably withheld); allow assignment to affiliate or in connection with bona fide M&A.",
    absencePresent: /(assignment|assign\s+this\s+agreement|change\s+of\s+control)/i,
  },
  {
    id: "missing.notices",
    severity: "P3",
    category: "missing-clause",
    title: "No notices clause",
    description: "Contract doesn't specify how legal notices are to be delivered.",
    remediation: "Add: notices in writing, delivered by hand / courier / email / registered post to addresses listed; deemed received on date of acknowledgment.",
    absencePresent: /(notice.{0,30}(shall|must)\s+be\s+(given|delivered|in\s+writing))/i,
  },
  {
    id: "missing.entire-agreement",
    severity: "P3",
    category: "missing-clause",
    title: "No entire-agreement clause",
    description: "Contract doesn't exclude prior or contemporaneous agreements / representations.",
    remediation: "Add 'This Agreement constitutes the entire agreement…' to avoid extrinsic-evidence disputes.",
    absencePresent: /entire\s+agreement|integrated\s+agreement|supersede\w*\s+all\s+(prior|previous)/i,
  },
];

export interface ScanInput {
  text: string;
  jurisdiction?: string;
}

export interface ScanResult {
  characters: number;
  findings: RiskFinding[];
  countBySeverity: Record<RiskSeverity, number>;
  countByCategory: Record<string, number>;
  riskScore: number; // 0-100
  summary: string;
}

export function scanContract(input: ScanInput): ScanResult {
  const text = input.text;
  const findings: RiskFinding[] = [];

  for (const rule of RULES) {
    // Filter by jurisdiction
    if (rule.jurisdictionScope && input.jurisdiction) {
      if (!rule.jurisdictionScope.includes(input.jurisdiction)) continue;
    }

    if (rule.presenceBad) {
      const match = rule.presenceBad.exec(text);
      if (match) {
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          category: rule.category,
          title: rule.title,
          description: rule.description,
          remediation: rule.remediation,
          excerpt: match[0].slice(0, 200),
          excerptOffset: match.index,
          alternateClauseId: rule.alternateClauseId,
          jurisdictionalNotes: rule.jurisdictionalNotes,
        });
      }
    }
    if (rule.absencePresent) {
      if (!rule.absencePresent.test(text)) {
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          category: rule.category,
          title: rule.title,
          description: rule.description,
          remediation: rule.remediation,
          alternateClauseId: rule.alternateClauseId,
          jurisdictionalNotes: rule.jurisdictionalNotes,
        });
      }
    }
  }

  const countBySeverity: Record<RiskSeverity, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const countByCategory: Record<string, number> = {};
  for (const f of findings) {
    countBySeverity[f.severity]++;
    countByCategory[f.category] = (countByCategory[f.category] || 0) + 1;
  }

  // Risk score: weighted by severity. 0 = pristine, 100 = catastrophic.
  const weighted = countBySeverity.P0 * 25 + countBySeverity.P1 * 10 + countBySeverity.P2 * 4 + countBySeverity.P3 * 1;
  const riskScore = Math.min(100, weighted);

  const summary = buildSummary(findings, riskScore);

  return {
    characters: text.length,
    findings,
    countBySeverity,
    countByCategory,
    riskScore,
    summary,
  };
}

function buildSummary(findings: RiskFinding[], score: number): string {
  if (findings.length === 0) {
    return "No detected issues. (Note: this is rule-based scanning; semantic risks may still exist.)";
  }
  const p0 = findings.filter(f => f.severity === "P0").length;
  const p1 = findings.filter(f => f.severity === "P1").length;
  const top = findings.filter(f => f.severity === "P0" || f.severity === "P1").slice(0, 3);
  let summary = `Risk score ${score}/100. `;
  if (p0 > 0) summary += `${p0} dealbreaker${p0 > 1 ? "s" : ""}. `;
  if (p1 > 0) summary += `${p1} high-severity issue${p1 > 1 ? "s" : ""}. `;
  if (top.length > 0) {
    summary += "Top concerns: " + top.map(f => f.title).join("; ") + ".";
  }
  return summary;
}

export function listRules(): { id: string; severity: string; category: string; title: string }[] {
  return RULES.map(r => ({
    id: r.id,
    severity: r.severity,
    category: r.category,
    title: r.title,
  }));
}
