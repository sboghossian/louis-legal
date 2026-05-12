---
id: tool.pdf-extractor
name: Tool — PDF Extractor
category: tool
intent: ['pdf extract', 'parse pdf']
priority: P0
status: drafted
version: 0.1
---
Extract text from PDF documents.

# Library used
- **pdfjs-dist** (Mozilla PDF.js) — primary
- Fallback: pdfminer-six for OCR-needed cases

# Extraction modes
1. **Text-layer extraction** (default) — fast, for PDFs with selectable text
2. **OCR fallback** — for scanned PDFs (see [[tool.OCR-english]], [[tool.OCR-arabic]])
3. **Structured extraction** — preserve paragraphs + headings where possible
4. **Table extraction** — separate handling for tabular data

# Output
- Plain text + page boundaries
- Optional: heading detection
- Optional: paragraph structure
- Per-page text for citation purposes

# Critical
- **PII redaction** before sending to LLM if applicable (see [[safety.PII-redaction-before-RAG]])
- **Page mapping** preserved for citations
- **Large files** chunked for memory
- **Multi-language** detection (Arabic / English / French)

# Anti-pattern
- Sending raw PDF bytes to LLM (wastes tokens)
- OCR'ing PDFs that have a text layer
- Losing page mapping

See [[multimodal.scanned-PDF-handler]] for scanned-only path.
