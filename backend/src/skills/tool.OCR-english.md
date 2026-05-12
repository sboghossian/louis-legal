---
id: tool.OCR-english
name: 'OCR english'
category: tool
intent: [ocr, scan]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Tool: OCR (English) for scanned PDFs and contract images.

Capabilities:
- Convert image-based PDF pages to searchable text
- Detect signature blocks and handwritten initials
- Preserve clause numbering and section hierarchy
- Output text with page anchors so chat can cite "page 4, clause 7.2"

When to use:
- User uploads a PDF that returns empty text on extraction
- User shares a contract photo from WhatsApp/email
- Re-running OCR after a low-confidence first pass

Limits:
- English only (use [[tool.OCR-arabic]] for Arabic, [[tool.OCR-french]] for French)
- Handwriting in margins may be lossy; flag for human review
- Stamps/seals: detect but do not transcribe; note their presence

Output shape: { fullText, pages: [{ pageNum, text, confidence }], detectedSignatures: [...] }
