---
id: research.regulation-lookup
name: 'regulation lookup'
category: research
intent: [regulation-lookup]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Regulation lookup (statutory / regulatory text).

Pull authoritative text of statutes, regulations, executive orders, and ministerial circulars:
- KSA: regulations from Bureau of Experts (BOE), CMA implementing regulations, SAMA circulars, ZATCA notices
- UAE Federal: Federal Decrees, Federal Laws (FDL), Cabinet Resolutions; per-emirate executive councils
- DIFC: DIFC Laws + DFSA Rulebook
- ADGM: FSRA Rulebook + ADGM Regulations
- Lebanon: Loi 26/1932 commercial code, Loi des sociétés, banking secrecy law 1956, etc.
- EU: per CELEX number
- US: USC sections, CFR titles

Output: { source, citation, fullText, asOfDate, consolidationFlag, linkToAuthority }

Always pair with [[research.regulator-guidance-lookup]] for interpretive guidance.
