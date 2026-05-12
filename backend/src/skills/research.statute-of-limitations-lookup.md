---
id: research.statute-of-limitations-lookup
name: 'statute of limitations lookup'
category: research
intent: [statute-of-limitations]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Statute of limitations / prescription period lookup.

Limitation periods vary widely:
- KSA: general 10 years (Sharia-influenced — no strict statute of limitations for some Hudud, but commercial: 5-10 yrs varies)
- UAE: commercial claims 10 yrs, employment 1 yr from termination, civil tort 3 yrs from knowledge
- Lebanon: 10 yrs commercial, 5 yrs employment, 30 yrs civil personal claims (varies)
- Egypt: 15 yrs civil, 10 yrs commercial
- France: 5 yrs civil/commercial, 2 yrs consumer
- England: 6 yrs contract / tort, 12 yrs deed, 6 yrs personal injury (from knowledge)
- US: state-by-state — typically 3-6 yrs contract, 2-3 yrs tort

Input: { jurisdiction, claimType, accrualDate, knowledgeDate (if discovery rule) }
Output: { limitationPeriod, expiryDate, tolling/suspension events: [...], warnings }

CRITICAL: limitation is procedural in some jurisdictions (judge raises ex officio) and substantive in others (must be pleaded). Flag.
