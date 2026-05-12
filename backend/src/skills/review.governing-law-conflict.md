---
id: review.governing-law-conflict
name: 'governing law conflict'
category: review
intent: [review, conflict-of-laws]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Review — governing-law + forum conflict check.

Inspect choice-of-law + choice-of-forum for:
- Validity of choice (Rome I in EU, common law freedom-of-contract in DIFC/ADGM/English, mandatory rules in KSA/UAE onshore)
- Mismatch: governing law England, forum DIFC — OK; governing law DIFC, forum onshore Dubai — possible problems
- Mandatory overriding rules (employment, consumer, antitrust apply regardless of choice)
- Public policy carve-outs (Sharia in KSA, public order in Lebanon/UAE)
- Sharia compliance carve-out (for Islamic-finance docs)
- Connection requirement (some jurisdictions reject choice if no nexus)
- Enforcement — NY Convention + Riyadh + GCC Convention for arbitration awards; reciprocity for foreign judgments

Output: { conflicts: [{ issue, severity, recommendation }], enforcementRisk }
