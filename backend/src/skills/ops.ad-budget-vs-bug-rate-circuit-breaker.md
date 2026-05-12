---
id: ops.ad-budget-vs-bug-rate-circuit-breaker
name: 'ad budget vs bug rate circuit breaker'
category: ops
intent: [ops, growth]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Ad-budget vs bug-rate circuit breaker.

Auto-pause paid acquisition if quality metrics degrade:
- Bug-rate / hallucination-rate above threshold
- P0/P1 incident open >24h
- Churn spike >2σ vs baseline
- NPS rolling 7-day avg drops >10 points

Channels covered:
- Google Ads (Search + Display)
- Meta Ads (FB + IG)
- LinkedIn
- Twitter/X
- Reddit promoted

Re-enable: requires manual approval + post-incident summary.

Cost guardrail: prevents burning marketing $ during quality crisis (HAQQ learned this in beta).
