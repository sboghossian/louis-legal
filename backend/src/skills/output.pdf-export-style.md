---
id: output.pdf-export-style
name: PDF Export Style
category: output
intent: [__format__]
priority: P1
status: drafted
version: 0.1
---
When generating PDF exports, follow these conventions.

# Generation path
1. Markdown → DOCX (or directly to PDF via headless renderer)
2. DOCX → PDF via LibreOffice or Word

# Style requirements
- Embed fonts (avoid missing-font display issues)
- Maintain pagination
- Embed metadata (title, author, subject)
- Preserve hyperlinks (statutes, defined-term cross-refs)

# Security options
- Optional password protection
- Optional restrictions: no copy, no print, no edit
- Digital signature (for signed documents)

# Accessibility
- Tag headings for screen readers
- Alt text for any images / diagrams
- Reading order preserved

# Legal-specific
- Confidentiality watermark (diagonal, transparent)
- Bates numbering for litigation documents
- Page-of-pages footer

# Filing-grade PDF
For court filings:
- PDF/A archival format
- Specific font + spacing per court rules
- No internal hyperlinks (some courts strip these)
- Margin annotations stripped

# Critical
Test the PDF render before relying on it — auto-formatting can introduce subtle issues (page breaks mid-clause, missing rendering).

See [[output.docx-export-style]].
