/**
 * Drafting Board templates.
 *
 * Each template seeds the canvas with a recognizable shape of work — a
 * matter that a transactional or in-house lawyer would actually run.
 * The skill slugs reference real entries under backend/src/skills/.
 */

import type { TemplateSeed, BoardNode, BoardEdge } from "./types";

function n(
    id: string,
    kind: BoardNode["kind"],
    lane: BoardNode["lane"],
    title: string,
    subtitle: string,
    opts: Partial<
        Pick<
            BoardNode,
            | "skills"
            | "inputs"
            | "outputs"
            | "approvalQuestion"
            | "approver"
            | "status"
        >
    > = {},
): Omit<BoardNode, "history"> {
    return {
        id,
        kind,
        lane,
        title,
        subtitle,
        status: opts.status ?? "idle",
        skills: opts.skills ?? [],
        inputs: opts.inputs ?? [],
        outputs: opts.outputs ?? [],
        approvalQuestion: opts.approvalQuestion,
        approver: opts.approver,
    };
}

function e(from: string, to: string): BoardEdge {
    return { from, to };
}

// ---------------------------------------------------------------------------
// M&A · Acme × Globex
// ---------------------------------------------------------------------------

const T_MA: TemplateSeed = {
    key: "ma",
    label: "M&A — Acme × Globex",
    blurb:
        "Term sheet through bring-down certificates. Eight steps, one partner gate before signing.",
    nodes: [
        n(
            "ma-brief",
            "input",
            "input",
            "Matter brief",
            "Acme acquires Globex (cash + earn-out)",
            {
                status: "done",
                outputs: ["Deal summary", "Parties + counsel"],
            },
        ),
        n(
            "ma-termsheet",
            "agent",
            "agent",
            "Term sheet",
            "Draft a clean term sheet from the brief",
            {
                skills: [
                    "corporate-ma",
                    "draft.share-purchase-agreement",
                ],
                inputs: ["Matter brief"],
                outputs: ["Term sheet v1"],
            },
        ),
        n(
            "ma-dd-checklist",
            "agent",
            "agent",
            "DD checklist",
            "Build a buyer-side diligence checklist",
            {
                skills: ["prompt-pack.due-diligence-report"],
                inputs: ["Term sheet v1"],
                outputs: ["Diligence request list"],
            },
        ),
        n(
            "ma-dd-findings",
            "agent",
            "agent",
            "DD findings",
            "Roll up findings from data-room review",
            {
                skills: [
                    "import.vendor-due-diligence-patrick-munro",
                    "efirm.conflict-check",
                ],
                inputs: ["Data room", "Diligence request list"],
                outputs: ["Findings memo"],
            },
        ),
        n(
            "ma-spa-draft",
            "agent",
            "agent",
            "SPA draft",
            "First pass at the share-purchase agreement",
            {
                skills: ["draft.share-purchase-agreement"],
                inputs: ["Term sheet v1", "Findings memo"],
                outputs: ["SPA v1"],
            },
        ),
        n(
            "ma-spa-redline",
            "agent",
            "agent",
            "SPA redline",
            "Run the firm playbook against the counterparty mark-up",
            {
                skills: [
                    "pa-workflow.transactional.contract-redline-20min",
                    "prompt-pack.full-contract-risk-review",
                ],
                inputs: ["SPA v1", "Counterparty mark-up"],
                outputs: ["Redline package"],
            },
        ),
        n(
            "ma-partner-gate",
            "gate",
            "gate",
            "Partner sign-off",
            "Final read before delivering to client",
            {
                approvalQuestion:
                    "Approve the redline package and closing checklist before they go to Acme's GC?",
                approver: "Partner — M&A",
                inputs: ["Redline package", "Closing checklist"],
            },
        ),
        n(
            "ma-closing",
            "agent",
            "agent",
            "Closing checklist",
            "Build the closing checklist + bring-down certificates",
            {
                skills: [
                    "draft.shareholder-resolution",
                    "draft.shareholders-agreement",
                ],
                inputs: ["SPA v1", "Findings memo"],
                outputs: ["Closing checklist", "Bring-down certificates"],
            },
        ),
        n(
            "ma-deliverables",
            "output",
            "output",
            "Deliverables",
            "Signed redline pack, ready for execution",
            {
                inputs: ["Redline package", "Closing checklist"],
                outputs: [
                    "Final SPA",
                    "Closing book",
                ],
            },
        ),
    ],
    edges: [
        e("ma-brief", "ma-termsheet"),
        e("ma-termsheet", "ma-dd-checklist"),
        e("ma-dd-checklist", "ma-dd-findings"),
        e("ma-dd-findings", "ma-spa-draft"),
        e("ma-spa-draft", "ma-spa-redline"),
        e("ma-dd-findings", "ma-closing"),
        e("ma-spa-redline", "ma-partner-gate"),
        e("ma-closing", "ma-partner-gate"),
        e("ma-partner-gate", "ma-deliverables"),
    ],
};

// ---------------------------------------------------------------------------
// Employment onboarding
// ---------------------------------------------------------------------------

const T_EMPLOYMENT: TemplateSeed = {
    key: "employment",
    label: "Employment onboarding",
    blurb:
        "Offer letter through Day-1 welcome — five drafts, one human checkpoint.",
    nodes: [
        n(
            "emp-intake",
            "input",
            "input",
            "New hire brief",
            "VP Engineering, Dubai, senior level",
            {
                outputs: ["Role + comp", "Jurisdiction"],
            },
        ),
        n(
            "emp-offer",
            "agent",
            "agent",
            "Offer letter",
            "Generate an offer letter to local labor law",
            {
                skills: [
                    "employment",
                    "draft.offer-letter",
                    "draft.employment-contract-UAE",
                ],
                inputs: ["New hire brief"],
                outputs: ["Offer letter draft"],
            },
        ),
        n(
            "emp-nda",
            "agent",
            "agent",
            "NDA",
            "Mutual NDA against the firm template",
            {
                skills: ["draft.NDA-mutual", "conversation.intake-NDA"],
                inputs: ["New hire brief"],
                outputs: ["NDA draft"],
            },
        ),
        n(
            "emp-ip",
            "agent",
            "agent",
            "IP assignment",
            "IP assignment with reasonable non-compete carve-outs",
            {
                skills: ["draft.IP-assignment"],
                inputs: ["New hire brief"],
                outputs: ["IP assignment draft"],
            },
        ),
        n(
            "emp-benefits",
            "agent",
            "agent",
            "Benefits enrollment",
            "Pre-fill the benefits enrollment kit",
            {
                skills: ["onboarding.feature-discovery-tour"],
                inputs: ["New hire brief"],
                outputs: ["Benefits kit"],
            },
        ),
        n(
            "emp-gate",
            "gate",
            "gate",
            "Hiring manager sign-off",
            "Last read before we send the packet",
            {
                approvalQuestion:
                    "Is the offer packet (offer, NDA, IP, benefits) ready to send to the new hire?",
                approver: "Hiring manager",
            },
        ),
        n(
            "emp-day1",
            "output",
            "output",
            "Day-1 welcome",
            "Onboarding email + signed packet to the new hire",
            {
                skills: ["growth.email-onboarding-sequence"],
                outputs: ["Welcome email", "Signed packet"],
            },
        ),
    ],
    edges: [
        e("emp-intake", "emp-offer"),
        e("emp-intake", "emp-nda"),
        e("emp-intake", "emp-ip"),
        e("emp-intake", "emp-benefits"),
        e("emp-offer", "emp-gate"),
        e("emp-nda", "emp-gate"),
        e("emp-ip", "emp-gate"),
        e("emp-benefits", "emp-gate"),
        e("emp-gate", "emp-day1"),
    ],
};

// ---------------------------------------------------------------------------
// Vendor due diligence
// ---------------------------------------------------------------------------

const T_VENDOR: TemplateSeed = {
    key: "vendor",
    label: "Vendor due diligence",
    blurb:
        "KYC intake, sanctions screen, MSA + DPA review, conflicts memo, approval gate.",
    nodes: [
        n(
            "vdd-intake",
            "input",
            "input",
            "KYC intake",
            "Vendor profile + UBO uploaded",
            {
                skills: ["draft.KYC-procedure"],
                outputs: ["Vendor profile"],
            },
        ),
        n(
            "vdd-sanctions",
            "agent",
            "agent",
            "Sanctions screen",
            "OFAC + EU + UK list screen",
            {
                skills: ["connector.OFAC-sanctions"],
                inputs: ["Vendor profile"],
                outputs: ["Sanctions report"],
            },
        ),
        n(
            "vdd-msa",
            "agent",
            "agent",
            "MSA review",
            "Run our risk playbook against the vendor MSA",
            {
                skills: [
                    "draft.MSA",
                    "conversation.intake-MSA",
                    "prompt-pack.full-contract-risk-review",
                ],
                inputs: ["Vendor MSA"],
                outputs: ["MSA risk report"],
            },
        ),
        n(
            "vdd-dpa",
            "agent",
            "agent",
            "DPA review",
            "GDPR / PDPL data-processing review",
            {
                skills: [
                    "draft.DPA-GDPR",
                    "draft.DPA-UAE-PDPL",
                    "draft.DPA-KSA-PDPL",
                ],
                inputs: ["Vendor DPA"],
                outputs: ["DPA risk report"],
            },
        ),
        n(
            "vdd-conflicts",
            "agent",
            "agent",
            "Conflicts memo",
            "Cross-check against existing client list",
            {
                skills: ["efirm.conflict-check"],
                inputs: ["Vendor profile"],
                outputs: ["Conflicts memo"],
            },
        ),
        n(
            "vdd-gate",
            "gate",
            "gate",
            "Approval gate",
            "GC sign-off before the vendor is added to the approved list",
            {
                approvalQuestion:
                    "Approve onboarding this vendor given the sanctions, contract, and conflicts findings?",
                approver: "General Counsel",
            },
        ),
        n(
            "vdd-decision",
            "output",
            "output",
            "Onboarding decision",
            "Approved / declined memo for procurement",
            {
                outputs: ["Decision memo"],
            },
        ),
    ],
    edges: [
        e("vdd-intake", "vdd-sanctions"),
        e("vdd-intake", "vdd-msa"),
        e("vdd-intake", "vdd-dpa"),
        e("vdd-intake", "vdd-conflicts"),
        e("vdd-sanctions", "vdd-gate"),
        e("vdd-msa", "vdd-gate"),
        e("vdd-dpa", "vdd-gate"),
        e("vdd-conflicts", "vdd-gate"),
        e("vdd-gate", "vdd-decision"),
    ],
};

// ---------------------------------------------------------------------------
// Contract review
// ---------------------------------------------------------------------------

const T_CONTRACT: TemplateSeed = {
    key: "contract",
    label: "Contract review",
    blurb:
        "Intake → playbook compare → redline → risk summary → partner approval → execute.",
    nodes: [
        n(
            "cr-intake",
            "input",
            "input",
            "Intake",
            "Counter-MSA uploaded by the business team",
            {
                outputs: ["Counterparty contract"],
            },
        ),
        n(
            "cr-playbook",
            "agent",
            "agent",
            "Playbook compare",
            "Match each clause to the firm playbook",
            {
                skills: [
                    "corporate-commercial",
                    "import.contract-review-anthropic",
                ],
                inputs: ["Counterparty contract"],
                outputs: ["Clause-by-clause delta"],
            },
        ),
        n(
            "cr-redline",
            "agent",
            "agent",
            "Redline draft",
            "Generate a clean redline + suggested re-wordings",
            {
                skills: [
                    "pa-workflow.transactional.contract-redline-20min",
                    "import.nda-review-jamie-tso",
                ],
                inputs: ["Clause-by-clause delta"],
                outputs: ["Redline document"],
            },
        ),
        n(
            "cr-risk",
            "agent",
            "agent",
            "Risk summary",
            "BLUF risk memo for the relationship partner",
            {
                skills: ["output.partner-memo-style"],
                inputs: ["Redline document"],
                outputs: ["Risk summary"],
            },
        ),
        n(
            "cr-gate",
            "gate",
            "gate",
            "Partner approval",
            "Last read before we send the redline back",
            {
                approvalQuestion:
                    "Send the redline + risk summary back to the counterparty as-is?",
                approver: "Relationship partner",
            },
        ),
        n(
            "cr-execute",
            "output",
            "output",
            "Execute",
            "Send the redline package; route to e-sign on counter-acceptance",
            {
                outputs: ["Final redline", "Executed contract"],
            },
        ),
    ],
    edges: [
        e("cr-intake", "cr-playbook"),
        e("cr-playbook", "cr-redline"),
        e("cr-redline", "cr-risk"),
        e("cr-risk", "cr-gate"),
        e("cr-gate", "cr-execute"),
    ],
};

export const TEMPLATES: TemplateSeed[] = [
    T_MA,
    T_EMPLOYMENT,
    T_VENDOR,
    T_CONTRACT,
];

export function findTemplate(key: string): TemplateSeed | undefined {
    return TEMPLATES.find((t) => t.key === key);
}
