---
id: workflow.full-due-diligence-pack
name: Full Due Diligence Pack
category: workflow
intent: ['due diligence', 'dd pack']
priority: P1
status: drafted
version: 0.1
---
Orchestrate a full legal due diligence pack for a transaction.

# Inputs
- Target company name + jurisdiction
- Transaction type (acquisition / investment / financing)
- Materiality threshold (typically tied to deal size)
- Documents data room access

# Workstreams (run in parallel)
1. **Corporate** — incorporation docs, cap table, shareholder agreements, board minutes, related-party transactions
2. **Commercial contracts** — top 20 by revenue; change-of-control clauses; assignability
3. **Employment** — top 10 employees + key contractors; severance exposure; restrictive covenants
4. **IP** — registered IP (TMs, patents, copyrights); IP ownership clean? open-source compliance?
5. **Real estate** — leases, ownership, encumbrances
6. **Litigation** — pending + threatened claims; settled past 5 years
7. **Regulatory** — licenses, permits, compliance gaps
8. **Tax** — open assessments, transfer pricing, withholding compliance
9. **Data privacy** — processing activities, transfers, breach history, GDPR / PDPL posture
10. **Financial** — disclosure schedules vs financial statements reconciliation

# Output
For each workstream: green/amber/red rating + list of findings + recommended actions (waiver, indemnity, reps & warranties scope, escrow).

# Aggregated DD report
- Executive summary (1 page)
- Critical findings (3-page top issues)
- Workstream sections (5-10 pages each)
- Disclosure schedule recommendations
- Reps & warranties scoping

# Skill orchestration
Loads many sub-skills: [[wf.transactional.deal-point-analysis]] · [[review.IP-ownership-clarity]] · [[review.compliance-gap-analysis]] · [[research.licensing-requirements-lookup]] · [[draft.IP-assignment]] (for fixing IP gaps).
