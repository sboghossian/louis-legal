---
id: tool.UAE-DED
name: 'UAE DED'
category: tool
intent: [registry-lookup, kyc]
jurisdictions: [UAE]
priority: P1
status: drafted
version: 0.2
---

Tool: UAE Department of Economic Development (DED) trade-name & license lookup.

Each emirate has its own DED:
- Dubai DED (now DET — Dubai Economy & Tourism)
- Abu Dhabi DED (ADDED)
- Sharjah Economic Development Department (SEDD)
- etc.

Lookup capabilities:
- Trade license number → entity name, license type, expiry, activities
- Trade name → registered owner / shareholders (if public)
- Activity code (e.g., 7020 management consulting) → permissions

Use cases:
- KYC counterparty due diligence
- Verify license expiry before signing
- Confirm signatory has authority (manager / partner in license)

Output: { license: { number, issuer, expiry, activities, shareholders, signatories } }

Note: Free zones (DIFC, ADGM, DMCC, JAFZA, etc.) have separate registers — use [[tool.UAE-freezone-registries]].
