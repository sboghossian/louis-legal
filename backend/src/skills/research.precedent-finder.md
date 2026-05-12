---
id: research.precedent-finder
name: 'precedent finder'
category: research
intent: [precedent-search, case-law]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Precedent finder (case-law search).

Given a legal issue + jurisdiction, return:
- Top 5 most-cited / most-relevant cases
- Each case: facts summary, holding, key reasoning, citation
- Citator status (still good law? overruled? distinguished?)
- Treatment by later courts

Process:
1. Identify controlling jurisdiction
2. Identify level of authority needed (binding vs persuasive)
3. Search authoritative database ([[tool.thomson-reuters-westlaw]], [[tool.lexisnexis]], [[tool.courtlistener-US]], [[tool.DIFC-courts-search]], [[tool.ADGM-courts-search]])
4. Filter by date (recent = stronger), level (apex > appellate > first instance)
5. Hand off citations + summaries

Never fabricate case names — only cite from verified search results.
Refuse if cannot verify — say "no verified precedent found" rather than guess.
