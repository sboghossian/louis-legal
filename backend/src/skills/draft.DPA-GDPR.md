---
id: draft.DPA-GDPR
name: Data Processing Agreement (GDPR)
category: draft
practice_area: data-privacy
intent: ['dpa gdpr', 'data processing agreement']
priority: P0
status: drafted
version: 0.1
---
Draft a Data Processing Agreement (DPA) compliant with GDPR Article 28.

# Required inputs
- Controller + Processor (and their respective DPOs if any)
- Subject matter and duration of processing
- Nature and purpose of processing
- Categories of data subjects + categories of personal data
- Sub-processors list (Annex)
- International transfers (mechanism: SCCs, adequacy, BCRs)

# Mandatory clauses (Article 28(3))
1. Process only on documented instructions
2. Confidentiality obligations on Processor's staff
3. Security measures (Annex II detailing technical + organizational measures)
4. Sub-processing: only with general or specific authorization + flow-down obligations
5. Assist Controller with data subject requests + privacy impact assessments + DPA security
6. Notification of personal data breach without undue delay (typically within 24-72 hours)
7. Return or delete personal data at end of services (Controller's choice)
8. Make available all info necessary to demonstrate compliance; allow audits

# Annexes
- **Annex I — Description of processing**: subject matter, duration, purpose, categories
- **Annex II — Technical and organizational measures**: encryption, access controls, backups, incident response
- **Annex III — Sub-processors list**: name, address, services performed

# International transfers
If transferring outside EEA/UK:
- **Adequacy decisions** (UK, Switzerland, Japan, S. Korea, etc.) — no extra mechanism needed
- **Standard Contractual Clauses (SCCs)** — Module 2 (Controller→Processor) or Module 3 (Processor→Processor)
- **Binding Corporate Rules** (intra-group transfers)
- **Article 49 derogations** — limited use cases (consent, performance of contract)

# UK-GDPR adaptations
Use UK IDTA (International Data Transfer Agreement) or UK Addendum to EU SCCs for transfers from UK.

# Critical
- Sub-processor authorization mechanism: general (Processor adds w/ notice) or specific (each requires written approval)?
- Audit rights — scope, frequency, cost-bearing
- Liability allocation — capped or uncapped? specific to data-breach scenarios?

See [[draft.privacy-policy]], [[draft.DPA-UAE-PDPL]], [[draft.DPA-KSA-PDPL]].
