---
id: tool.docx-extractor
name: Tool — DOCX Extractor
category: tool
intent: ['docx extract', 'parse docx']
priority: P0
status: drafted
version: 0.1
---
Extract text + structure from DOCX (Microsoft Word) files.

# Library
- **mammoth** — primary (preserves structure, handles tracked changes)
- Fallback: docx parsing library for specific structural needs

# Extraction modes
1. **Plain text** — fastest, for prompt context
2. **Structured (Markdown)** — preserves headings, bold/italic, lists
3. **HTML** — for browser display
4. **Tracked changes** — accept/reject + change history

# Output
- Plain text + structure metadata
- Track-change marks (when present)
- Footnotes + comments (when present)

# Critical
- **Tracked changes** preserved when present (important for redline workflows)
- **Comments** extracted separately
- **Tables** handled separately
- **Embedded images** — alt text extracted; images stored separately

# Use cases
- Doc workspace `/content` endpoint ([[/api/doc-workspace/:docId/content]])
- Chat tool `read_document`
- Contract review pipelines

# Anti-pattern
- Losing tracked-change history
- Treating comments as inline text
