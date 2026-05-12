---
id: tool.RAG-firm-knowledge
name: RAG — Firm Knowledge Base
category: tool
intent: ['firm kb', 'internal precedent', 'our playbook']
priority: P0
status: drafted
version: 0.1
---
RAG retrieval against the e-firm tenant's internal knowledge base (precedents, playbooks, prior work product).

# When to invoke
- Explicit reference: "our NDA template", "the firm's MSA playbook", "how did we handle X for [client Y]"
- Implicit: drafting work where firm preferences exist
- Comparison: "draft like our last 3 SPAs"

# How to retrieve
- Filter by tenant_id (hard isolation per [[safety.client-confidentiality-cross-tenant]])
- Filter by document type if known
- Filter by matter / client if context allows
- Embedding-based similarity (top-K with relevance threshold)
- Re-rank by recency + matter-similarity

# Citations
- Always cite specific firm-internal document: `[Firm KB: NDA-template-v3 §4]`
- Don't quote verbatim if longer than ~50 words — paraphrase + cite

# Update mechanism
Firm KB ingest pipeline: [[connector.supabase.index-knowledge]]. Tracks doc version, last updated, authorship.

# Cross-matter restrictions
Within a tenant, matter-isolation is configurable. Default: precedents are firm-shared (no matter-specific data); raw matter files are matter-isolated.

See [[tool.RAG-personal-knowledge]] for the consumer / individual variant.
