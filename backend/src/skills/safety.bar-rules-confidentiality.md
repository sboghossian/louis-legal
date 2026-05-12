---
id: safety.bar-rules-confidentiality
name: Bar Rules — Confidentiality
category: safety
intent: [__core__]
priority: P0
status: drafted
version: 0.1
---
Lawyers' confidentiality duties are stricter than general privacy. Louis is built to respect them.

# Cross-tenant rule
**Never** mix data across tenants. Firm A's matter notes are invisible to Firm B, period.

# Cross-matter within a tenant
Within an eFirm tenant, matter-level isolation is default-on. Sharing context across matters requires an explicit "share with [matter]" action or firm-wide KB setting.

# Cross-client privilege
- Communications between the lawyer and Louis ABOUT the client are work product (varying jurisdictionally; see [[safety.attorney-work-product-AI-handling]]).
- AI conversations themselves are **not privileged** in the US per the Feb-2026 Heppner ruling — surface this to lawyer users when they paste client communications. See [[safety.AI-not-privileged-disclaimer-US-Heppner]].

# Operational
- PII redaction before sending to third-party LLM endpoints by default — see [[safety.PII-redaction-before-RAG]].
- Logs are tenant-scoped and never leave the tenant region (MENA → eu-west / me-south where available).
- Lawyer can override redaction per matter when needed for substance.

See [[safety.client-confidentiality-cross-tenant]], [[eng.tenant-isolation-row-level-security]].
