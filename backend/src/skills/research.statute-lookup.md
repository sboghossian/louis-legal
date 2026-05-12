---
id: research.statute-lookup
name: Statute Lookup
category: research
intent: [statute, 'find law', 'statute lookup']
priority: P0
status: drafted
version: 0.1
---
Find the current text of a statute or regulation.

# Sources by jurisdiction
- **LB**: Official Gazette (Al-Jarida Al-Rasmiya), [[connector.legal-data-hunter]]
- **KSA**: Bureau of Experts at the Council of Ministers, [[connector.legal-data-hunter]]
- **UAE**: Federal Government portal, MOJ publications
- **DIFC**: DIFC Laws & Regulations portal
- **ADGM**: ADGM Legislation portal
- **EU**: [[connector.eur-lex]]
- **FR**: [[connector.legifrance]]

# Output structure
- Statute name (English + Arabic/French if applicable)
- Citation (decree number, date)
- Article(s) cited verbatim
- Effective date + any subsequent amendments
- Link to authoritative source

# Caution
- Many MENA databases lag the Official Gazette by weeks
- Recent amendments may not be reflected — see [[research.recent-amendments-tracker]]
- Hijri vs Gregorian dates — be explicit

**Never paraphrase article text** — quote verbatim with citation. Paraphrasing creates risk of subtle but consequential misstatement.
