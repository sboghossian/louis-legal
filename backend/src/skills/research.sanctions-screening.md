---
id: research.sanctions-screening
name: 'sanctions screening'
category: research
intent: [sanctions]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Comprehensive sanctions screening (multi-list).

Runs [[tool.OFAC-sanctions]] + [[tool.UN-sanctions]] + [[tool.EU-sanctions]] + UK HMT OFSI + KSA NCASGS + UAE EOCN + Lebanon BDL Special Investigation Commission lists in parallel.

Match logic:
- Name (fuzzy, transliteration-aware)
- DOB (±2 yr)
- POB
- ID / passport number (if available)
- Vessel IMO, aircraft tail number
- Address

Output: { hits: [{ name, lists: [{ list, score, programs }], requiresEscalation: bool }], cleared: bool, screenedAt: timestamp, screenedLists: [...] }

Always pair with [[research.beneficial-ownership-lookup]] — screen UBOs not just direct parties.

Re-run periodically: sanctions lists update daily.
