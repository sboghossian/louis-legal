---
id: tool.EU-sanctions
name: 'EU sanctions'
category: tool
intent: [sanctions, screening]
jurisdictions: [EU, __multi__]
priority: P1
status: drafted
version: 0.2
---

Tool: EU Consolidated Financial Sanctions List (CFSP) screening.

EU sanctions are layered on top of UN: COUNCIL DECISION (CFSP) regulations add EU-specific designations (Russia/Ukraine restrictions 833/2014 et seq., Belarus, Syria, Iran nuclear, etc.).

Differs from OFAC:
- EU "asset freeze" applies to all EU persons + entities owned/controlled
- "Available indirectly" rule is wider than OFAC's 50% Rule
- Export control / dual-use goods (Reg 2021/821) overlap

Output: { hits: [{ name, regulation, listingDate, reasons }], cleared: bool, exportControlFlags: [...] }

Always cross-check with [[tool.UN-sanctions]], [[tool.OFAC-sanctions]], and HMT (UK) for Gulf transactions involving London counterparties.
