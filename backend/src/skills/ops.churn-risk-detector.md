---
id: ops.churn-risk-detector
name: 'churn risk detector'
category: ops
intent: [churn, ops]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Churn risk detector.

Predictive model. Inputs:
- Login frequency trend
- Messages-per-session trend
- Feature breadth (drift to single feature = risk)
- Support ticket volume
- NPS detractor score
- Plan downgrade history
- Time-since-last-success-event
- Recent churn-signal events (export-all, delete-account inquiry, billing-dispute)

Output: { userId, riskScore (0-100), topSignals: [...], suggestedAction: ... }

Triggers:
- Risk > 70: CSM outreach
- Risk > 90: discount offer / save-call
- Risk > 95: cancel-prevention flow

Pair with [[ops.NPS-collector-in-chat]] and [[unlock.empty-state-suggestions]].
