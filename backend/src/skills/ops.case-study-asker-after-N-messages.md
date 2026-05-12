---
id: ops.case-study-asker-after-N-messages
name: 'case study asker after N messages'
category: ops
intent: [case-study, ops]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Case-study ask trigger.

When user has had N high-value successful turns:
- "Louis helped you save ~X hours. Would you share a 1-paragraph quote we can use?"
- Or: "Mind if we feature your firm on the customer wall?" (logo only)

Triggers:
- 50+ turns, 90+ days tenure
- NPS promoter (9-10)
- Matter closed-won (if attributed)

Format: short in-chat prompt + skip/later/yes flow.

Saves to [[outreach.testimonial-collector]] for marketing use.
