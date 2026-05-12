---
id: ops.error-classifier
name: 'error classifier'
category: ops
intent: [error, ops]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Error classifier.

Auto-classifies errors into:
- Transient (timeout, rate-limit, network) → retry
- Provider (LLM 5xx) → fail-over to next provider
- Client input (bad doc, oversized upload) → user-friendly retry guidance
- Auth / quota (out of credits, expired token) → upgrade / refresh flow
- Backend bug → P-level ticket
- Schema / data integrity → DBA escalation

Output: { errorClass, action, userMessage, internalTicket }

Used by frontend error boundaries + backend middleware.
