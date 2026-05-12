---
id: conversation.intake-MSA
name: 'intake MSA'
category: conversation
intent: [intake]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Intake conversation — MSA (Master Services Agreement).

Guided multi-turn intake to gather MSA inputs:
1. Parties (Provider / Customer; entity names + CR numbers)
2. Scope (what services, statement of work appended via SOW)
3. Term + termination + renewal
4. Fees + payment terms + invoicing cadence + late fees
5. Confidentiality + IP ownership (work-product, background, license-back)
6. Warranties + service levels + remedies
7. Indemnity + cap on liability
8. Insurance requirements
9. Data protection (GDPR / PDPL DPA addendum)
10. Subcontracting + assignment
11. Force majeure
12. Governing law + DR + venue
13. Notices addresses

Output: structured JSON + auto-drafted MSA via [[draft.MSA]].
