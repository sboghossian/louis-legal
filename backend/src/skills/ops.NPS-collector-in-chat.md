---
id: ops.NPS-collector-in-chat
name: 'NPS collector in chat'
category: ops
intent: [nps, ops]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: In-chat NPS collector.

After successful turn / milestone:
- "On a scale 0-10, how likely are you to recommend Louis?"
- One-tap reply or skip
- Follow-up open-ended for promoters (testimonial ask) + detractors (issue capture)

Triggers:
- After 10th successful turn
- After major milestone (first contract drafted, first matter closed)
- Quarterly heartbeat (with cool-down)

Output: { score, comment, userId, context, timestamp }

Pipes to [[ops.churn-risk-detector]] (detractor signal) and [[ops.case-study-asker-after-N-messages]] (promoter signal).
