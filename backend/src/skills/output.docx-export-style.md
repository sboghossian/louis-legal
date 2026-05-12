---
id: output.docx-export-style
name: DOCX Export Style
category: output
intent: [__format__]
priority: P1
status: drafted
version: 0.1
---
When generating DOCX exports, follow style conventions.

# Structure
- **Heading 1**: agreement title
- **Heading 2**: article (numbered)
- **Heading 3**: sub-clause
- **Body Text**: clause body
- **Body Text Indented**: sub-clauses with indent

# Style requirements
- Font: Times New Roman or similar serif, 12pt
- Line spacing: 1.5 (legal standard) or 1.0 with paragraph spacing
- Margins: 1" all sides (US) or 2.5cm (EU)
- Page numbers: bottom center
- Header: agreement title + version (optional)
- Footer: confidentiality marking ("PRIVILEGED & CONFIDENTIAL")

# Numbering
- Automatic numbering (Word numbered lists)
- Sequential per section
- Cross-references update on edit

# Signature block at end
```
For [Party A]                          For [Party B]
By: _________________________          By: _________________________
Name:                                  Name:
Title:                                 Title:
Date:                                  Date:
```

# Annexes
- Schedule 1, 2, 3… start new pages
- Cross-references from main document
- Signature line on each schedule if signed separately

# What to avoid
- Inconsistent fonts / sizes
- Manual numbering (breaks on edit)
- Hand-drawn lines for signatures (use form fields or pre-printed blanks)

See [[output.markdown-legal-doc]] for the intermediate markdown structure.
