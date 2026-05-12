---
id: tool.legifrance-FR
name: 'legifrance FR'
category: tool
intent: [statute-lookup]
jurisdictions: [FR]
priority: P1
status: drafted
version: 0.2
---

Tool: Legifrance (FR official legal text).

The official French government repository for:
- Codes (Code civil, Code de commerce, Code du travail, etc.)
- Lois, ordonnances, décrets, arrêtés
- Conventions collectives
- Jurisprudence (Cassation, Conseil d'Etat, Constitutional Council)
- Treaties

Lookup by:
- Article reference (e.g., "Art. 1134 du Code civil")
- Keyword (full-text)
- ECLI for case law
- Date / consolidation point

Output: { articleText (with consolidation flag), version effectiveDate, history }

Useful for [[review.governing-law-conflict]] when French law applies via choice-of-law in MENA contracts (common for francophone-influenced Lebanon, Tunisia, Morocco).
