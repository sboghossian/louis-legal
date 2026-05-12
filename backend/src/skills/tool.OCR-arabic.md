---
id: tool.OCR-arabic
name: Tool — OCR (Arabic)
category: tool
intent: ['ocr arabic', 'scanned arabic']
priority: P0
status: drafted
version: 0.1
---
Extract text from scanned Arabic-language PDFs and images.

# When invoked
- User uploads a scanned PDF (text not selectable)
- Arabic content detected in scan
- User explicitly asks to "extract" or "OCR"

# Pipeline
1. Detect Arabic via image character recognition or PDF metadata
2. Use Arabic-tuned OCR engine (Tesseract with `ara` traineddata; Google Cloud Vision; AWS Textract; Microsoft Read)
3. Apply post-processing: dehyphenation, RTL ordering, ligature normalization
4. Extract structure (paragraph boundaries, headings) where possible
5. Return text + confidence score per block

# Quality considerations
- Hand-written Arabic is far harder than typed; warn user of expected accuracy
- Ottoman / classical script differs from modern Arabic
- Mixed Arabic-English documents need bilingual OCR
- Numerical content (especially with Hindi-Arabic numerals) needs careful handling

# Privacy
Document content sent to third-party OCR services creates data-residency concerns:
- For tenant matters, prefer on-premise / private endpoints
- Audit log of OCR'd content
- Apply [[safety.PII-redaction-before-RAG]] before any post-OCR processing

# Output
Plain text + structure metadata.
