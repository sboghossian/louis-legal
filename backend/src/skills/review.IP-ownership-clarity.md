---
id: review.IP-ownership-clarity
name: 'IP ownership clarity'
category: review
intent: [review, ip]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Review — IP ownership clarity check.

Inspect contract clauses governing IP for:
- Who owns work-product (created during engagement)? Default rules vary by jurisdiction
- Background IP carve-out + license-back
- Foreground IP assignment language ("hereby assigns" not "agrees to assign" — Stanford v Roche distinction)
- Moral rights (waivable in some jurisdictions, not others — France, Lebanon, Egypt: moral rights inalienable)
- Joint inventorship treatment
- Improvements & derivatives
- Open-source obligations (GPL contamination)
- Patent assignment requirements (PTO recordation in US, EPO national-phase)
- Software escrow

Output: { findings: [{ clause, issue, severity, suggestedFix, jurisdictionalNote }], overallRiskScore }

Common red flags:
- "Work made for hire" — only specific categories under US §101
- Missing license-back of background IP
- Silent on improvements (default rules differ)
