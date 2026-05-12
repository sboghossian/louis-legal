---
id: conversation.intake-trademark-filing
name: 'intake trademark filing'
category: conversation
intent: [intake, ip]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Intake conversation — trademark filing.

1. Mark (word, logo, sound, scent, 3D)
2. Owner (entity or individual)
3. Goods/services (Nice classification 1-45)
4. Countries (single / multiple / Madrid Protocol designation list)
5. Prior use (date of first use, evidence)
6. Existing registrations
7. Clearance search done? Results?
8. Special character handling (Arabic script for MENA filings)
9. Color / no-color claim
10. Description of mark

Output: intake summary + filing strategy (national vs Madrid) + clearance recommendation via [[research.precedent-finder]] + cost estimate.

Pair with [[tool.WIPO-trademark-search]] + [[tool.local-trademark-registers]].
