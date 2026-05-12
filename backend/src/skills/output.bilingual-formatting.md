---
id: output.bilingual-formatting
name: Bilingual Formatting
category: output
intent: [__format__]
priority: P0
status: drafted
version: 0.1
---
Format bilingual output cleanly.

# Two-column (best in docx and pdf)
Use a 2-column table. Left column English, right column Arabic (or based on jurisdiction convention).

# Stacked (better in chat / markdown)
For each clause:
```
## Article 1. [English Heading]
[English text]

## المادة 1. [Arabic Heading]
[Arabic text]
```

# RTL handling
- Arabic numerals: use Western Arabic digits (1, 2, 3) — they work bidirectionally
- Currency: use ISO code (LBP, AED, SAR) not symbol — symbols render poorly in RTL contexts
- Punctuation: Arabic uses `،` (comma) and `؛` (semicolon) — use these in Arabic text, Western punctuation in English text

# Controlling language statement
Always end the bilingual doc with:
> *In the event of any conflict between the Arabic and English versions, the **[Arabic / English]** version shall prevail.*

See [[draft.bilingual-AR-EN-side-by-side]] and [[heuristic.bilingual-AR-EN-mirror-clauses]].
