---
id: multimodal.scanned-PDF-handler
name: Scanned PDF Handler
category: voice
intent: ['scanned pdf', 'ocr pdf']
priority: P0
status: drafted
version: 0.1
---
Process scanned PDFs (image-based, no text layer) through OCR pipeline.

# Detection
- PDF has no text layer OR text layer is gibberish
- Page count + first-page image content
- File metadata indicates scan

# Pipeline
1. Send to OCR engine ([[tool.OCR-arabic]] or [[tool.OCR-english]])
2. Reconstruct paragraph structure
3. Detect tables (often need separate handling)
4. Detect signatures + signature blocks
5. Return text + metadata (page numbers, confidence per block)

# Quality flags
- Confidence per page (low confidence → flag to user)
- Mixed Arabic-English documents
- Handwriting (lowest accuracy)
- Stamps / official seals (often unreadable)
- Multi-column layouts (need column detection)

# Critical
- **Preserve original page mapping** — when user asks about "page 3", you can pin to exact location
- **PII redaction** before downstream RAG ([[safety.PII-redaction-before-RAG]])
- **Confidence threshold** — below 80% per block, flag to user for manual verification
- **Legal weight** — OCR'd evidence may have different evidentiary weight than original

See [[multimodal.signature-page-detector]].
