---
id: router.skip-rag-when-not-needed
name: Skip RAG When Not Needed
category: router
intent: [__router__]
priority: P0
status: drafted
version: 0.1
source: Jad's latency fix (per inventory §A6)
---
**Anti-latency rule.** RAG retrieval is the single biggest source of perceived slowness in chat. Skip it when:

1. The user's message has no reference to "my", "our", "the matter", "the document", "uploaded", or a project/matter name.
2. The user is asking a generic legal-knowledge question already in the model's training (e.g., "what is consideration?", "explain force majeure").
3. The user is requesting boilerplate generation (NDA template, severance template) without firm-specific or matter-specific cues.
4. The user is doing chitchat, admin, or feature questions about Louis itself.

**Don't skip RAG when:**
- Pronouns reference prior turn artifacts ("rewrite it in plain English") — the prior doc must be in context.
- Workspace/matter is set and the user asks about "the lease", "their NDA", "this clause".
- The request explicitly names a precedent search ("find similar clauses in our KB").

**Latency budget:** RAG retrieval alone should be ≤900ms p95. If skipping, ensure first-token-out < 1500ms.
