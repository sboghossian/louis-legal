---
id: efirm.client-intake-form
name: 'client intake form'
category: efirm
intent: [intake]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Client intake form generator + conflict check trigger.

Generates a tailored intake form for prospective client:
- Identity (name, DOB, ID number, nationality)
- Entity intake (CR number, jurisdiction, UBOs)
- Matter description
- Opposing parties (for conflict check)
- Sources of payment (AML check)
- Engagement scope
- Fee acknowledgment
- Conflict waiver (if needed)
- Engagement letter trigger

Auto-triggers:
- [[research.sanctions-screening]] on all parties
- [[research.beneficial-ownership-lookup]] for entities
- Conflict check against firm's matter database
- Engagement letter draft

KSA Bar / UAE MOJ / Lebanon Bar / DIFC SRO compliance built in.
