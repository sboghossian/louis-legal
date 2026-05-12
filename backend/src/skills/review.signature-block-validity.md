---
id: review.signature-block-validity
name: 'signature block validity'
category: review
intent: [review, execution]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Review — signature block validity.

Pre-execution check that signature pages are legally valid:
- Signatory has authority (verify via license / CR / board resolution / POA)
- Capacity printed correctly (Director / Manager / Authorized Signatory)
- Entity name matches commercial registration exactly (including Arabic version where required)
- Witness blocks (UAE requires 2 witnesses for certain commercial docs; KSA notarization for some)
- Date format consistent
- Counterparts clause if signed in counterparts
- Apostille / legalization layer if cross-border
- E-signature vs wet ink (jurisdiction recognition — see [[tool.e-signature-orchestrator]])
- Common seal requirement (older Lebanese / KSA docs)
- Initialing every page (UAE customary; not strictly required for validity)

Output: { issues: [{ signatory, problem, severity, remediation }] }
