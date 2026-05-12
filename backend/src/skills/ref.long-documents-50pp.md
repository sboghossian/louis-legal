---
id: ref.long-documents-50pp
name: Reference — Long Documents (50+ pages)
category: ref
intent: [__ref__]
priority: P1
status: drafted
version: 0.1
---
Handling long documents:
- Don't paste entire doc in prompt (token cost + context window)
- Use [[multimodal.scanned-PDF-handler]] for extraction
- Chunked processing with summary at each chunk
- Outline first, then targeted analysis per section
- Vector embedding for semantic search within doc
- Tool-call patterns: load full doc, agent navigates sections
