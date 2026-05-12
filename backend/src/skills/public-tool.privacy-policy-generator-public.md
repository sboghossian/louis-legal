---
id: public-tool.privacy-policy-generator-public
name: 'privacy policy generator public'
category: public-tool
intent: [privacy, public-tool]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Public tool — privacy policy generator (free).

Inputs (form):
- Business name + sector
- Data collected (checkbox: name, email, phone, payment, location, behavioral, sensitive)
- Purposes (checkbox: provide service, marketing, analytics, compliance, ML training)
- Recipients (checkbox: service providers, payment processors, advertisers, authorities, affiliates)
- International transfers (yes/no + countries)
- Jurisdiction (KSA / UAE / Bahrain / Egypt / EU / UK / US)

Output:
- Privacy policy DOCX + PDF
- Cookie policy (separate, modular)
- ROPA template
- DPIA template

Multi-jurisdiction: KSA PDPL, UAE PDPL, GDPR, CCPA, etc. — outputs jurisdiction-specific addenda.
