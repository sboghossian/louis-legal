---
id: tool.LB-commercial-register
name: 'LB commercial register'
category: tool
intent: [registry-lookup, kyc]
jurisdictions: [LB]
priority: P1
status: drafted
version: 0.2
---

Tool: Lebanon Commercial Register (Sijil al-Tijari) lookup.

Searches the registry held by each Mohafaza commercial court (Beirut, Mt Lebanon, North, South, Bekaa, Nabatieh).

Fields:
- Registration number
- Company name (Arabic / Latin)
- Form (SAL, SARL, etc.)
- Capital + paid-up capital
- Object clause
- Partners / shareholders (for SARL — visible; for SAL — not always)
- Board members + statutory auditor
- Mortgages / liens
- Bankruptcy / liquidation status

Caveat: data freshness varies — Beirut court tends to be slower; verify with notarized excerpt for high-stakes deals.

Bridge: [[research.beneficial-ownership-lookup]] for UBO past the share-register layer.
