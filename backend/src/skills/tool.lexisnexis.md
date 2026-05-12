---
id: tool.lexisnexis
name: 'lexisnexis'
category: tool
intent: [case-law-search, legal-research]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Tool: LexisNexis (premium legal research).

Coverage similar to Westlaw with key differences:
- Stronger UK, France (JurisClasseur), Germany
- Stronger MENA via Lexis Middle East (KSA, UAE, Bahrain, Kuwait, Oman, Qatar — Arabic + English)
- Shepard's citator (vs Westlaw's KeyCite)

Use Lexis Middle East specifically for:
- KSA regulatory updates (CMA, SAMA, ZATCA)
- UAE federal + local decrees
- DIFC/ADGM Court judgments (full text)

Output: { cases, statutes, practiceGuidance, citator: { stillGoodLaw: bool, treatments: [...] } }

Pair with [[tool.thomson-reuters-westlaw]], [[research.precedent-finder]].
