---
id: draft.will
name: Will / Testament
category: draft
practice_area: estate-personal-status
intent: [will, testament, وصية, succession]
required_inputs: [testator, jurisdiction, religion_or_civil_regime, beneficiaries, executor]
priority: P0
status: drafted
version: 0.1
related: [safety.medical-tax-financial-out-of-scope, kb.family-law-LB-personal-status]
---
Draft a will. **MENA personal-status law is heavily fragmented by religion / confession**. Get the testator's religion / civil status BEFORE drafting.

# Required inputs
1. Testator: full name, ID, religion / confession (or "civil")
2. Marital status, surviving spouse, children
3. Jurisdiction of habitual residence + jurisdiction of immovable property (these may differ; immovables follow lex situs)
4. Beneficiaries with shares
5. Executor (and alternates)
6. Specific bequests if any

# Religion / confession determines applicable law
**Lebanon** — 18 official confessions, each with its own personal-status court and rules:
- Sunni / Shia / Druze: Islamic inheritance rules apply (fixed shares; testament limited to ⅓ of estate for non-heirs)
- Christian confessions (Maronite, Greek Orthodox, etc.): each has its own ecclesiastical rules; broader testamentary freedom
- Civil (no religion): no codified civil personal-status regime exists for LB nationals → many opt for foreign-civil-law marriages and inherit through foreign-civil-law mechanisms

**KSA** — Sharia law applies to all Muslims (Sunni Hanbali default); testamentary freedom limited to ⅓ for non-heirs.

**UAE** — Federal Law 41/2022 (Civil Personal Status for non-Muslims) provides civil-law inheritance for non-Muslims. Muslims default to Sharia. DIFC Wills Service Centre allows non-Muslims to register English-law-style wills.

# Sharia inheritance basics (if testator is Muslim)
- Reserved shares (fara'id) for heirs by Quranic mandate
- Testamentary disposition limited to ⅓ of estate for non-heirs
- Bequests to heirs invalid without other heirs' consent
- See [[kb.shariah-finance-AAOIFI]] and [[heuristic.shariah-compliance-check-when-relevant]]

# Civil-law / non-Muslim
Broader testamentary freedom. Standard residuary clause, specific bequests, executor appointment, witness requirements (typically 2 disinterested witnesses).

# Form requirements
- LB: handwritten (olographe), witnessed, or notarial form
- UAE non-Muslim: registered with DIFC Wills Service Centre OR notarized in Abu Dhabi Judicial Department for civil-law option
- KSA Muslim: notarized via Notary Public, complies with Sharia validity

# Standard sections
1. Identification of testator
2. Revocation of prior wills
3. Appointment of executor and alternates, guardianship of minors
4. Specific bequests
5. Residuary clause
6. Funeral / burial wishes (advisory)
7. Witness / notarization block
8. Date and signature

# Critical
- ALWAYS flag the jurisdiction-religion interaction explicitly to the user before drafting.
- ALWAYS advise the user that wills involving real estate in multiple jurisdictions may require multiple coordinated wills (one per situs).
- ALWAYS surface that this is a high-stakes document and recommend lawyer review even if drafted by Louis — see [[router.escalation]].
