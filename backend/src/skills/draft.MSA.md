---
id: draft.MSA
name: Master Services Agreement
category: draft
practice_area: corporate
intent: [msa, 'master services', 'services agreement']
required_inputs: [service_provider, client, services_scope, jurisdiction, term]
priority: P0
status: drafted
version: 0.1
---
Draft a Master Services Agreement under which the Parties will execute one or more Statements of Work.

# Required inputs
1. **Service Provider** (company name, entity type, registration)
2. **Client** (same)
3. **Scope of services** — high-level description; details go in SOWs
4. **Term** — default 1 year, auto-renewing 1-year periods unless 30/60/90-day notice
5. **Governing law**
6. **Fee structure** — fixed / time-and-materials / outcome-based / hybrid

# Optional inputs
- Most-favored-customer clauses
- Exclusivity / non-compete
- IP ownership: work-for-hire vs license-back; pre-existing IP carve-out
- Data processing rider (if Client data is being handled, attach a DPA — see [[draft.DPA-GDPR]] / [[draft.DPA-KSA-PDPL]] / [[draft.DPA-UAE-PDPL]])

# Structure
1. Parties + recitals
2. Definitions
3. SOW process (each SOW is incorporated by reference, governed by this MSA, ranked below MSA on conflict)
4. Services & deliverables
5. Acceptance criteria
6. Fees, expenses, invoicing, late payment interest
7. IP — clear allocation of pre-existing IP, foreground IP, and Client deliverables (see [[draft.IP-assignment]] for assignment language)
8. Confidentiality (incorporate NDA-grade obligations; reference any standalone NDA)
9. Reps & warranties (Provider: capability, no conflicts, compliance with law; Client: authority, accurate info, timely review)
10. Limitation of liability — cap at fees paid in the preceding 12 months; consequential / indirect damages excluded; carve-outs for IP indemnity, confidentiality, willful misconduct, fraud
11. Indemnification — IP indemnity from Provider; third-party-claim indemnities from Client for Client-content
12. Term & termination (for convenience with notice; for cause with cure period; insolvency)
13. Post-termination — transition assistance, deliverable handoff, return of materials, surviving clauses
14. Force majeure
15. Dispute resolution (arbitration recommended for cross-border)
16. Boilerplate (see [[draft.boilerplate-clauses]])

# SOW template (separate doc)
Each SOW contains: scope, deliverables, schedule, acceptance, fees, project-specific milestones. Provide as a one-page Schedule template.

# Common negotiation points (flag proactively)
- Liability cap: Provider wants 12-month fees cap; Client wants greater multiplier + IP / data-breach carve-outs
- IP ownership: services-output IP — Client wants assignment, Provider wants license-back
- Termination for convenience: notice period is the negotiating axis

See [[review.MSA-deep-review]] and [[review.indemnification-balance]].
