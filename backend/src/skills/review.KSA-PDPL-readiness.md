---
id: review.KSA-PDPL-readiness
name: 'KSA PDPL readiness'
category: review
intent: [review, data-protection, ksa]
jurisdictions: [KSA]
priority: P1
status: drafted
version: 0.2
---

Skill: Review — KSA PDPL (Personal Data Protection Law) readiness.

Saudi Arabia's PDPL (Royal Decree M/19, effective September 2024, enforced by SDAIA's Saudi Data & AI Authority):

Check contract / DPIA / processing for:
- Lawful basis (consent, contract, legal obligation, legitimate interest — narrower than GDPR)
- Data subject rights (access, rectification, erasure, portability — newer in PDPL)
- Cross-border transfer rules (adequacy determinations, controller assurance, exceptions per Art. 29)
- Data Protection Officer appointment (mandatory for high-volume / sensitive)
- Privacy notice fields
- Sensitive data handling (health, biometrics, race, religion, criminal)
- Breach notification timing (72 hours)
- Records of Processing Activities (Art. 31 ROPA)

Output: { gaps: [{ requirement, currentState, severity, remediation }], readinessScore (0-100), criticalActions: [...] }

Pair with [[draft.privacy-policy-MENA]] and [[review.UAE-PDPL]] for multi-jurisdiction operations.
