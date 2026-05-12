---
id: safety.attorney-work-product-AI-handling
name: 'attorney work product AI handling'
category: safety
intent: [safety, privilege]
jurisdictions: [__multi__]
priority: P0
status: drafted
version: 0.2
---

Skill: Safety — attorney work-product handling.

Work-product doctrine protections may be lost if disclosed to third parties — including AI vendors in some interpretations.

Best practice:
- Use only enterprise-grade AI with confidentiality controls (no-training default, encrypted storage, jurisdictional data residency)
- For privileged material: do NOT paste into consumer-grade tools
- Audit trail: log who accessed what (Louis: [[ops.audit-log-export]])
- Client engagement letter should disclose AI use (informed consent)
- Cross-border data transfer rules apply: GDPR (EU client docs) → AI vendor location matters
- KSA PDPL / UAE PDPL: similar cross-border transfer constraints

Louis enforces:
- No-training by default on all skills
- Tenant-isolated storage
- Cross-region data residency (MENA cluster for MENA clients on request)
- Access logs surface in [[docs.audit-log-export]]
- Confidentiality skill [[safety-compliance.confidentiality-and-privilege]]
