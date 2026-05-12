---
id: review.definitions-consistency
name: 'definitions consistency'
category: review
intent: [review, drafting]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Review — definitions consistency check.

For each defined term ("Affiliate", "Confidential Information", "Material Adverse Effect", etc.):
- Used consistently throughout
- Definition not contradicted by inline use
- Singular/plural matched usage
- Definition not buried in clause body when central concept
- Defined terms in CAPS or Title Case consistently
- "include" vs "including, without limitation" usage

Output: { findings: [{ term, definition, inconsistencies: [{ location, excerpt }] }], suggestedDefinitions: [...] }

Pair with [[review.cross-reference-integrity]] for full drafting QC pass.
