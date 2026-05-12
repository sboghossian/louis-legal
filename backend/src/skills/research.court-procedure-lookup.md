---
id: research.court-procedure-lookup
name: 'court procedure lookup'
category: research
intent: [procedure-lookup]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Court procedure lookup.

For a given court + matter type, return:
- Required initial filings (statement of claim, supporting affidavits, exhibits)
- Filing fees + payment method
- Service of process rules (personal, registered post, publication)
- Response deadlines
- Discovery / disclosure regime (common-law vs civil-law)
- Witness rules (live, written, expert)
- Costs framework (loser pays / each side bears)
- Appeal track + deadlines

Jurisdictions covered (initial):
- DIFC Courts (English common law procedure)
- ADGM Courts
- UAE Onshore Civil Courts (DIFCCD if commercial)
- Saudi: General Courts, Commercial Courts, Labor Courts, Administrative Courts (Diwan al-Mazalim)
- Lebanon: Civil, Commercial, Criminal, Labor, Administrative (Conseil d'Etat / Shura)
- English High Court (Commercial)
- LCIA, DIAC, DIFC-LCIA arbitration rules

Output: structured checklist with citations to court rules.
