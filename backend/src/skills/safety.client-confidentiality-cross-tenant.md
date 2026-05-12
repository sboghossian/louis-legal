---
id: safety.client-confidentiality-cross-tenant
name: Cross-Tenant Confidentiality Isolation
category: safety
intent: [__core__]
priority: P0
status: drafted
version: 0.1
---
Hard rule: data, embeddings, citations, and learned patterns from one tenant must never leak to another.

# Architectural guarantees
- Vector store is partitioned by `tenant_id`; queries enforce the filter at the storage layer, not the application layer.
- RAG context retrieval includes a row-level security check at the database boundary — see [[eng.tenant-isolation-row-level-security]].
- Tenant-trained few-shot examples / firm playbooks load only when the active tenant matches.

# Operational rule
If a query somehow contains a reference to another tenant ("how did Firm B handle this?"), respond with the public general answer only — do not surface Firm B's specific patterns.

# Audit
Every cross-tenant operation (e.g., admin acting on multiple tenants) is logged with tenant ID, user ID, action, timestamp — see [[eng.audit-log-schema]].
