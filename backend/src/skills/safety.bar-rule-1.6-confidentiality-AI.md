---
id: safety.bar-rule-1.6-confidentiality-AI
name: Bar Rule 1.6 — Confidentiality + AI
category: safety
intent: [__core__]
priority: P0
status: drafted
version: 0.1
---
ABA Model Rule 1.6 (and analogs): lawyer must maintain client confidentiality except in specific circumstances.

# Application to AI tools
1. **Sending client data to AI providers** — potential confidentiality breach
2. **Training data concerns** — does the AI provider train on inputs?
3. **Data residency** — where is data processed + stored?
4. **Cross-tenant isolation** — could another tenant see your data?

# Best practices
- **Use AI tools with strong confidentiality controls** — encryption, tenant isolation
- **Avoid sending raw client identifying info** when generic queries suffice
- **PII redaction** before sending to AI ([[safety.PII-redaction-before-RAG]])
- **Audit logs** of what's been sent to AI
- **Data Processing Agreements** with AI vendors

# Louis architecture
- Tenant isolation enforced at storage layer
- PII redaction option (configurable)
- Audit logs preserved
- No training on tenant data (verify with provider TOS)

# Specific MENA considerations
- **Data residency** — may need EU / KSA / UAE residency for some clients
- **Cross-border transfers** — comply with PDPL / GDPR requirements

# Penalties for failure
- Bar discipline
- Civil liability (privacy laws + client claims)
- Regulatory sanctions

# Critical
Never send to AI:
- National IDs / passport numbers (without redaction)
- Specific case details with identifying parties (where AI provider isn't under DPA)
- Privileged client communications (when AI conversation isn't privileged — see [[safety.AI-not-privileged-disclaimer-US-Heppner]])

See [[safety.client-confidentiality-cross-tenant]] and [[safety.PII-redaction-before-RAG]].
