---
id: justice.result-page-routing
name: 'result page routing'
category: justice
intent: [routing]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Result-page routing.

When user's intent is "show me a result page" (vs continue chatting):
- Document drafted → route to [[doc-workspace]] with draft loaded
- Research memo → route to memo viewer + Bib panel
- Cap-table reconciled → route to cap-table viewer
- Translation → route to side-by-side translation viewer
- Multi-doc compare → route to compare viewer
- Cite-check → route to citation report

Result page > inline chat for:
- Structured outputs needing reformatting
- Outputs >500 lines
- Outputs needing follow-up tools
- Outputs that benefit from anchors / cross-refs / TOC

Otherwise: stay in chat.
