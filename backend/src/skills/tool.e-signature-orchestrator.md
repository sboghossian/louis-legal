---
id: tool.e-signature-orchestrator
name: 'e signature orchestrator'
category: tool
intent: [e-signature]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Tool: E-signature orchestrator (DocuSign / Adobe Sign / Tawqi3i / UAE Pass).

Routing rules:
- KSA: use Tawqi3i (national e-signature) or Nafath for B2C; DocuSign for cross-border B2B
- UAE: UAE Pass (PKI) for gov-facing; DocuSign Connect for commercial
- Egypt: ITIDA-licensed providers required for "advanced" signatures
- Lebanon: e-Signature Law 81/2018 — qualified electronic signatures recognized
- EU: eIDAS Qualified TSPs (Adobe, GlobalSign, etc.)

Output: { signerOrder, fields, recipients, callbackUrl }

Validity guardrails:
- Witness requirements (UAE: 2 witnesses for some commercial docs)
- Notarization layer (e.g., Saudi MOJ Najiz notary for certain agreements)
- Apostille / legalization if cross-border execution
