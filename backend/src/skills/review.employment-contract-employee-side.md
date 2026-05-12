---
id: review.employment-contract-employee-side
name: 'employment contract employee side'
category: review
intent: [review, employment]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Review — employment contract (employee-side).

Red-flag scan from employee's perspective:
- Compensation: base + variable, on-target vs guaranteed, currency clause
- Benefits: health, education allowance (common in MENA), housing, transport, EOSB matching the law floor
- Term: fixed vs unlimited (UAE pre-2022 reform → all unlimited now under FDL 33/2021)
- Notice: balanced both ways (1-3 months commercial sense)
- Non-compete: enforceability + scope (geography, duration <2 yr, considerations to pay), [[review.term-noncompete-enforceability-MENA]]
- IP assignment: scope of "during employment"
- Probation: max 6 months (UAE), 90 days (KSA)
- Confidentiality: post-employment duration
- Termination: cause definition; severance per law; gratuity (EOSB) calculation
- Governing law + forum

Output: { findings: [{ clause, issue, severity, suggestedRedline }], negotiationLevers: [...] }
