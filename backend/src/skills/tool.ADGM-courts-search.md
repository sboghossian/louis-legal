---
id: tool.ADGM-courts-search
name: 'ADGM courts search'
category: tool
intent: [court-search, adgm]
jurisdictions: [UAE-ADGM]
priority: P1
status: drafted
version: 0.2
---

Tool: ADGM Courts case search.

Abu Dhabi Global Market Courts are English-common-law courts. The case database covers:
- Court of First Instance, Court of Appeal
- Small Claims Division
- Employment Division
- Arbitration Division (DIAC seat overflow)

Search by:
- Party name (corporate or individual)
- Case number (e.g., ADGMCFI-2024-CIV-123)
- Practice area
- Date range

Output: { cases: [{ number, parties, status, judgments: [pdfUrl] }], totalHits }

Note: ADGM judgments are publicly accessible; full text is searchable. Pair with [[tool.DIFC-courts-search]] when client may forum-shop between the two.
