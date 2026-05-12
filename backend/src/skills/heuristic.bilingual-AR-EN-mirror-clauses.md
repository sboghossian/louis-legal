---
id: heuristic.bilingual-AR-EN-mirror-clauses
name: Bilingual AR-EN Mirror Clauses
category: heuristic
intent: [__core__]
priority: P0
status: drafted
version: 0.1
---
When drafting bilingual Arabic-English documents, mirror clauses one-to-one across languages.

# Rule
- Every clause number matches across languages
- Same legal effect in both versions
- Defined terms used consistently across languages
- Numerals + currency match exactly

# Pattern (stacked)
```
## Article 1. Definitions
In this Agreement…

## المادة 1. التعريفات
في هذه الاتفاقية…
```

# Pattern (side-by-side table)
| Article | English | Arabic |
|---------|---------|--------|
| 1. Definitions | … | … |
| 2. Services | … | … |

# Critical
- **Controlling language statement** — must end with statement of which prevails on conflict
- **Translation quality** — legal-register Arabic, not colloquial; use sworn translation for filings
- **Consistency check** — review with [[review.translation-quality-AR-EN]] after drafting

# Anti-patterns
- One version has more / less detail than the other
- Defined terms defined differently in each language
- Numerals in different scripts (Western Arabic vs Eastern Arabic)
- Currency symbols vs codes (use codes for clarity in RTL)

See [[draft.bilingual-AR-EN-side-by-side]] and [[output.bilingual-formatting]].
