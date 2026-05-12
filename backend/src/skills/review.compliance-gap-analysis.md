---
id: review.compliance-gap-analysis
name: 'compliance gap analysis'
category: review
intent: [review, compliance]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Review — compliance gap analysis (multi-framework).

Map client's current state vs requirements across frameworks:
- AML/KYC (FATF 40 Recs, FATF Travel Rule for crypto)
- Sanctions (OFAC, UN, EU, UK, MENA national lists)
- Data protection (GDPR, KSA PDPL, UAE PDPL, Bahrain PDPL, Egypt PDPL, etc.)
- Anti-bribery (FCPA, UK Bribery Act, KSA Anti-Bribery Law)
- ESG / disclosure (CSRD for EU operations, SEC climate disclosure, Saudi Green Initiative)
- Sector-specific (banking, insurance, fintech, healthcare, telco)

Output: { framework, currentState, requiredState, gap, remediation, owner, targetDate, severity }

Always disclose materiality threshold: distinguish "blocker" from "polish".
