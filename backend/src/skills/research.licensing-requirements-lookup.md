---
id: research.licensing-requirements-lookup
name: 'licensing requirements lookup'
category: research
intent: [licensing-lookup, regulatory]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Licensing requirements lookup (activity → required licenses).

Given a client business activity and target jurisdiction, identify all required licenses:
- Commercial license (DED / MOC / free zone)
- Sector-specific (financial: SAMA/CMA/SCA/DFSA/FSRA; healthcare: MoH/DOH/DHA/SCFHS; food: ADAFSA/SFDA; education: MOE/SCAI)
- Professional licenses (legal: SBA/UAE MOJ/Beirut/Tripoli Bar; accountants: SOCPA/SBA; doctors: HAAD/DHA/SCFHS)
- Environmental, fire/safety, labor, data protection

Output: { license, issuer, validity, cost, leadTime, prereqs, renewalPath }

Cross-reference [[tool.UAE-DED]] / [[tool.KSA-MOC]] / [[tool.LB-commercial-register]] for specific filing.
