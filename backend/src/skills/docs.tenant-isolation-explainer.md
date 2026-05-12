---
id: docs.tenant-isolation-explainer
name: 'tenant isolation explainer'
category: docs
intent: [__docs__]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Tenant isolation: each customer is in a logically isolated Postgres tenant with row-level security + KMS keys.

No cross-tenant access; admin tools require dual-control.
