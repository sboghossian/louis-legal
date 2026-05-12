---
id: output.markdown-legal-doc
name: Markdown Format for Legal Documents
category: output
intent: [__format__]
priority: P0
status: drafted
version: 0.1
---
Format legal documents in markdown so they render cleanly and convert to docx/pdf.

# Structure
- Title: `# AGREEMENT TITLE` (one H1)
- Article / section: `## 1. Article Heading`
- Sub-clause: `### 1.1` (or just `**1.1**` for inline numbering)
- Definitions section as a table or alphabetized bullet list with terms in bold

# Numbering
- Decimal (1, 1.1, 1.1.1) — preferred for cross-references
- Letters (a, b, c) — for sub-items
- Match jurisdiction tradition: civil-law often (a), (b), (c); common-law often Article 1.1, 1.2

# Cross-references
- Inline: "as set forth in Section 4.2"
- Be consistent — use one style throughout

# Signature block
At the very end:
```
For and on behalf of [Party A]
Name: ___________________________
Title: ___________________________
Date: ____________________________

For and on behalf of [Party B]
Name: ___________________________
Title: ___________________________
Date: ____________________________
```

# What to avoid
- Markdown features that don't survive DOCX export (e.g., footnotes, callouts)
- Code blocks for legal text — use blockquotes instead
- Emoji or icons in body text — formal documents only

See [[output.docx-export-style]] and [[output.pdf-export-style]].
