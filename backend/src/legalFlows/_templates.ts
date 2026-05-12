/**
 * Legal Workflow Orchestration — multi-step legal flows ("playbooks").
 *
 * Each template is a recipe: a sequence of steps with skill/tool hooks,
 * decision points, and outputs. Designed to be executed manually (Louis chat),
 * semi-automatically (one click per step), or fully (background runner).
 */

export interface FlowStep {
  id: string;
  title: string;
  description: string;
  /** Skill IDs to invoke at this step (composed into system prompt). */
  skills?: string[];
  /** Tools / calculators to invoke. */
  tools?: string[];
  /** Information needed from user before this step can run. */
  inputs?: { name: string; type: "text" | "number" | "boolean" | "file" | "party" | "date"; required: boolean; description?: string }[];
  /** Outputs this step produces. */
  outputs?: string[];
  /** Decision point — depending on output, branch to step IDs. */
  branches?: { condition: string; nextStepId: string }[];
  /** Whether human review is required before next step auto-runs. */
  requiresReview?: boolean;
}

export interface FlowTemplate {
  id: string;
  title: string;
  description: string;
  category: "transactional" | "litigation" | "advisory" | "compliance" | "ip" | "employment" | "family" | "regulatory";
  jurisdictions: string[];
  estimatedDuration?: string;
  steps: FlowStep[];
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  // ===================================================
  // MSA NEGOTIATION FLOW
  // ===================================================
  {
    id: "msa-negotiate",
    title: "Negotiate an MSA from intake to signature",
    description: "Full transactional workflow: client intake → conflict check → first draft → counterparty redlines → final → execution.",
    category: "transactional",
    jurisdictions: ["__multi__"],
    estimatedDuration: "1-3 weeks",
    steps: [
      {
        id: "intake",
        title: "Client intake & matter open",
        description: "Gather basic facts and open a matter with conflict check.",
        skills: ["conversation.intake-MSA", "efirm.client-intake-form"],
        tools: ["matters.conflict-check"],
        inputs: [
          { name: "clientName", type: "text", required: true, description: "Client legal name (entity)" },
          { name: "counterparty", type: "text", required: true, description: "Counterparty name" },
          { name: "matterType", type: "text", required: true, description: "transactional / advisory / etc." },
          { name: "scope", type: "text", required: true, description: "Brief scope of services" },
        ],
        outputs: ["matterId", "engagementLetter"],
        requiresReview: false,
      },
      {
        id: "screen-counterparty",
        title: "KYC + sanctions screen on counterparty",
        description: "Run sanctions + UBO + license verification.",
        skills: ["research.sanctions-screening", "research.beneficial-ownership-lookup"],
        tools: ["tool.OFAC-sanctions", "tool.UN-sanctions", "tool.EU-sanctions"],
        inputs: [
          { name: "counterpartyEntity", type: "party", required: true },
        ],
        outputs: ["sanctionsReport", "uboChain"],
        requiresReview: true,
        branches: [
          { condition: "if any sanctions hit", nextStepId: "abort-sanctions" },
          { condition: "else", nextStepId: "draft-msa" },
        ],
      },
      {
        id: "abort-sanctions",
        title: "Halt — sanctions hit",
        description: "Sanctions hit detected. Cannot proceed without firm AML/sanctions partner sign-off.",
        skills: ["safety.AI-disclosure-required-tribunals"],
        requiresReview: true,
      },
      {
        id: "draft-msa",
        title: "Generate first MSA draft",
        description: "Generate MSA from clause library tuned to jurisdiction.",
        skills: ["draft.MSA"],
        tools: ["clauses.library"],
        inputs: [
          { name: "governingLaw", type: "text", required: true },
          { name: "fees", type: "text", required: true },
          { name: "term", type: "text", required: true },
        ],
        outputs: ["msaDraftV1"],
        requiresReview: true,
      },
      {
        id: "internal-review",
        title: "Internal risk scan",
        description: "Run risk scanner over first draft.",
        tools: ["risk.scan"],
        outputs: ["riskReport"],
        requiresReview: true,
      },
      {
        id: "send-to-counterparty",
        title: "Send draft to counterparty",
        description: "Email draft with cover note.",
        skills: ["tool.email-drafter", "efirm.client-update-email-draft"],
        outputs: ["coverEmail"],
        requiresReview: true,
      },
      {
        id: "process-redlines",
        title: "Process counterparty redlines",
        description: "Diff incoming redlines vs prior version. Categorize as acceptable / push-back / dealbreaker.",
        skills: ["review.dispute-resolution-mechanism-fit", "review.governing-law-conflict"],
        inputs: [
          { name: "counterpartyRedlines", type: "file", required: true },
        ],
        outputs: ["redlineAnalysis", "negotiationPlan"],
        requiresReview: true,
      },
      {
        id: "final-version",
        title: "Finalize for execution",
        description: "Apply agreed redlines; cross-reference check; signature blocks.",
        skills: ["review.cross-reference-integrity", "review.signature-block-validity", "review.definitions-consistency"],
        outputs: ["msaDraftFinal"],
        requiresReview: true,
      },
      {
        id: "execute",
        title: "Route for signature",
        description: "DocuSign / Tawqi3i / UAE Pass workflow.",
        skills: ["tool.e-signature-orchestrator"],
        outputs: ["executedAgreement", "executionLog"],
      },
    ],
  },

  // ===================================================
  // EMPLOYMENT TERMINATION FLOW
  // ===================================================
  {
    id: "employment-termination",
    title: "Employee termination playbook (MENA)",
    description: "From decision-to-terminate through final settlement + reference letter.",
    category: "employment",
    jurisdictions: ["UAE", "KSA", "BH", "QA"],
    estimatedDuration: "2-4 weeks",
    steps: [
      {
        id: "assess-cause",
        title: "Assess termination basis",
        description: "Classify: for-cause / convenience / mutual / redundancy. Documents needed by category.",
        skills: ["review.employment-contract-employer-side"],
        inputs: [
          { name: "terminationBasis", type: "text", required: true },
          { name: "employeeName", type: "party", required: true },
          { name: "contractFile", type: "file", required: true },
        ],
        outputs: ["basisMemo"],
        requiresReview: true,
      },
      {
        id: "calc-eosb",
        title: "Calculate EOSB / gratuity",
        description: "Compute statutory gratuity per jurisdiction.",
        tools: ["calculators.eos"],
        inputs: [
          { name: "jurisdiction", type: "text", required: true },
          { name: "basicSalaryMonthly", type: "number", required: true },
          { name: "serviceDays", type: "number", required: true },
          { name: "endedByResignation", type: "boolean", required: false },
          { name: "dismissedForCause", type: "boolean", required: false },
        ],
        outputs: ["eosbBreakdown"],
      },
      {
        id: "draft-notice",
        title: "Draft termination notice",
        description: "Termination notice + final-account schedule.",
        skills: ["draft.termination-letter", "draft.final-account"],
        outputs: ["terminationNotice", "finalAccount"],
        requiresReview: true,
      },
      {
        id: "non-compete-check",
        title: "Non-compete enforceability",
        description: "Verify post-termination restrictions are enforceable in jurisdiction.",
        skills: ["review.term-noncompete-enforceability-MENA"],
        outputs: ["nonCompeteMemo"],
      },
      {
        id: "deliver",
        title: "Deliver notice",
        description: "In-person + recorded delivery. Document time of delivery.",
        outputs: ["deliveryProof"],
      },
      {
        id: "settle",
        title: "Settle final account",
        description: "Pay statutory entitlements + accrued leave + ticket + EOSB.",
        outputs: ["paymentRecord", "settlementDeed"],
      },
      {
        id: "reference",
        title: "Reference letter",
        description: "Issue UAE/KSA-compliant reference letter (avoid defamation; verify-only language).",
        skills: ["draft.reference-letter"],
        outputs: ["referenceLetter"],
      },
    ],
  },

  // ===================================================
  // TRADEMARK FILING FLOW
  // ===================================================
  {
    id: "trademark-filing",
    title: "Trademark filing across MENA + Madrid",
    description: "Clearance → application → publication → registration → watch.",
    category: "ip",
    jurisdictions: ["UAE", "KSA", "EG", "LB", "__multi__"],
    estimatedDuration: "6-18 months",
    steps: [
      {
        id: "intake",
        title: "Brand & filing intake",
        description: "Capture mark, classes, owner, prior use, target jurisdictions.",
        skills: ["conversation.intake-trademark-filing"],
        outputs: ["filingBrief"],
      },
      {
        id: "clearance",
        title: "Clearance search",
        description: "Search WIPO + national registers for conflicts.",
        skills: ["research.precedent-finder"],
        tools: ["tool.WIPO-trademark-search", "tool.local-trademark-registers"],
        outputs: ["clearanceReport"],
        requiresReview: true,
      },
      {
        id: "strategy",
        title: "Filing strategy",
        description: "Decide national vs Madrid Protocol designations. Recommend classes + sub-classes.",
        outputs: ["filingStrategy"],
        requiresReview: true,
      },
      {
        id: "applications",
        title: "Draft + file applications",
        description: "Per-jurisdiction filing (KSA SAIP, UAE MoEC, etc.) or Madrid designation.",
        skills: ["draft.trademark-application"],
        outputs: ["applicationRecords"],
      },
      {
        id: "respond-office-actions",
        title: "Respond to office actions",
        description: "Examination, oppositions — respond with arguments + evidence.",
        skills: ["pa-workflow.IP.office-action-response-drafter"],
        outputs: ["officeActionResponses"],
      },
      {
        id: "register",
        title: "Registration",
        description: "Receive registration certificate; track renewals.",
        outputs: ["registrationCertificate", "renewalCalendar"],
      },
      {
        id: "watch",
        title: "Trademark watch",
        description: "Configure watch service for confusingly similar filings.",
        outputs: ["watchConfig"],
      },
    ],
  },

  // ===================================================
  // LITIGATION DEFENSE FLOW
  // ===================================================
  {
    id: "litigation-defense",
    title: "Defend a litigation claim",
    description: "Service of claim → assess → respond → discovery → trial → judgment.",
    category: "litigation",
    jurisdictions: ["__multi__"],
    estimatedDuration: "6 months to 3 years",
    steps: [
      {
        id: "service-receipt",
        title: "Receive service of claim",
        description: "Record date served, deadline-track response.",
        tools: ["tool.date-tool-deadline-calculator"],
        inputs: [
          { name: "claimDocument", type: "file", required: true },
          { name: "serviceDate", type: "date", required: true },
          { name: "courtJurisdiction", type: "text", required: true },
        ],
        outputs: ["responseDeadlines"],
      },
      {
        id: "preliminary-assessment",
        title: "Preliminary assessment",
        description: "Substantive claims, jurisdiction issues, limitation defenses, standing.",
        skills: ["research.statute-of-limitations-lookup", "justinian.principle-of-locus-standi"],
        outputs: ["assessmentMemo"],
        requiresReview: true,
      },
      {
        id: "decision-defend-settle",
        title: "Defend vs settle decision",
        description: "Run EV analysis.",
        skills: ["casesim.outcome-probability-estimator", "casesim.settlement-vs-trial-EV-calculator"],
        outputs: ["evAnalysis"],
        requiresReview: true,
      },
      {
        id: "answer",
        title: "Draft answer / defense",
        description: "Statement of defense, counterclaims if any.",
        skills: ["draft.statement-of-defense", "draft.counterclaim"],
        outputs: ["answerDraft"],
        requiresReview: true,
      },
      {
        id: "preliminary-motions",
        title: "Preliminary motions",
        description: "Jurisdictional objections, dismissal motions.",
        outputs: ["motionsFiled"],
      },
      {
        id: "discovery",
        title: "Discovery / disclosure",
        description: "Document production, witness statements, expert reports.",
        outputs: ["discoveryProduced", "witnessStatements"],
      },
      {
        id: "trial-prep",
        title: "Trial preparation",
        description: "Witness prep, cross prep, exhibit organization, opening + closing drafts.",
        skills: ["casesim.client-Q-and-A-prep", "casesim.cross-examination-rehearsal"],
        outputs: ["trialPrepFile"],
      },
      {
        id: "hearing",
        title: "Hearing",
        description: "Deliver opening, witnesses, cross, closing.",
        outputs: ["hearingTranscript"],
      },
      {
        id: "judgment",
        title: "Judgment",
        description: "Receive judgment; assess appeal grounds.",
        outputs: ["judgment", "appealMemo"],
      },
    ],
  },

  // ===================================================
  // GDPR / PDPL READINESS FLOW
  // ===================================================
  {
    id: "gdpr-pdpl-readiness",
    title: "Data protection readiness (GDPR + UAE/KSA PDPL)",
    description: "Privacy program from data mapping to policy + DPA + cross-border mechanism.",
    category: "compliance",
    jurisdictions: ["EU", "UAE", "KSA", "__multi__"],
    estimatedDuration: "8-16 weeks",
    steps: [
      {
        id: "intake",
        title: "Privacy intake",
        description: "Capture organization, data subjects, data types, processing purposes.",
        skills: ["conversation.intake-data-privacy-assessment"],
        outputs: ["privacyIntake"],
      },
      {
        id: "data-mapping",
        title: "Data mapping",
        description: "Build ROPA from intake; identify flows + processors + sub-processors.",
        outputs: ["ropa", "dataFlowDiagram"],
        requiresReview: true,
      },
      {
        id: "gap-analysis",
        title: "Gap analysis vs frameworks",
        description: "Compare current state vs GDPR + UAE PDPL + KSA PDPL requirements.",
        skills: ["review.compliance-gap-analysis", "review.KSA-PDPL-readiness"],
        outputs: ["gapReport"],
        requiresReview: true,
      },
      {
        id: "policies",
        title: "Policies + procedures",
        description: "Privacy notice, cookie policy, retention schedule, breach response plan, DSAR procedure.",
        skills: ["draft.privacy-policy-MENA"],
        outputs: ["privacyNotice", "cookiePolicy", "retentionSchedule", "breachPlan", "dsarProcedure"],
      },
      {
        id: "vendor-dpas",
        title: "Vendor DPAs",
        description: "Identify processors; sign DPA + cross-border transfer mechanism.",
        outputs: ["dpasSigned", "transferRegister"],
      },
      {
        id: "training",
        title: "Staff training",
        description: "Awareness training for all staff + role-based for IT/HR/Marketing/Sales.",
        outputs: ["trainingRecord"],
      },
      {
        id: "ongoing",
        title: "Ongoing monitoring",
        description: "DPIA pipeline for new initiatives; breach drills; DPO retainer.",
        outputs: ["dpiaPipeline"],
      },
    ],
  },
];

export function listFlows(): { id: string; title: string; description: string; category: string; jurisdictions: string[]; stepCount: number }[] {
  return FLOW_TEMPLATES.map(f => ({
    id: f.id,
    title: f.title,
    description: f.description,
    category: f.category,
    jurisdictions: f.jurisdictions,
    stepCount: f.steps.length,
  }));
}

export function getFlow(id: string): FlowTemplate | undefined {
  return FLOW_TEMPLATES.find(f => f.id === id);
}
