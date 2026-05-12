---
id: review.cross-reference-integrity
name: 'cross reference integrity'
category: review
intent: [review, drafting]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Review — cross-reference integrity check.

Scan contract for:
- Broken section/clause references ("see Section 4.2" when only 4.1 exists)
- Defined terms used before defined or never defined
- Defined terms defined twice with different meanings
- Schedule / Exhibit references with missing attachment
- Cross-references to wrong page after edit
- Capitalized terms not in definitions section
- Forward references where backward intended

Output: { issues: [{ location, type, suggestedFix }], allCrossRefs: [...], unusedDefinitions: [...], undefinedCapitalizedTerms: [...] }

Critical pre-execution check — catches drafting bugs that escape human review on contracts >50 pages.
