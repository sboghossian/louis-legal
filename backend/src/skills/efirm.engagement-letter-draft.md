---
id: efirm.engagement-letter-draft
name: eFirm: Engagement Letter Draft
category: efirm
intent: ['engagement letter efirm']
priority: P0
status: drafted
version: 0.1
---
eFirm-specific engagement letter generation, integrated with matter creation workflow.

This is the firm-operationalized version of [[draft.engagement-letter]].

# Auto-populated from matter context
- Client name + address (from CRM)
- Matter description (from matter creation form)
- Responsible partner + team
- Fee quote (from [[efirm.fee-quote-builder]])
- Conflict-check confirmation (from [[efirm.conflict-check]])

# Firm-branded template
- Logo + letterhead
- Firm's standard terms appendix (boilerplate from firm KB)
- Bar-rule disclosures for the firm's jurisdiction(s)
- Trust account / IOLTA details if applicable
- E-signature integration (DocuSign / Tawqi3i)

# Workflow
1. Auto-draft on matter creation
2. Partner review → adjustments
3. Send to client via e-signature
4. On client signature → matter status: "active"
5. Trigger billing setup + team access grants

# Audit trail
- Version history of the engagement letter
- Conflict-check timestamp + outcome
- Signature events
- All accessible in matter file
