---
id: efirm.deadline-tracker
name: 'deadline tracker'
category: efirm
intent: [deadline, calendar]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Matter deadline tracker.

For each matter, surface:
- Statutory deadlines (limitation, filing windows, response deadlines)
- Court-ordered deadlines
- Internal milestones (target close, draft deadlines)
- Client-driven deadlines

For each deadline:
- Date + time + timezone
- Calendar reminder + escalation chain
- Owner + backup
- Pre-deadline tasks
- Consequences of miss (sanctions / claim-bar / lost-position)

Pair with [[tool.date-tool-deadline-calculator]] for accurate calculation including jurisdiction holidays.

Alert escalation:
- T-14 days: assign owner, brief team
- T-7: status check
- T-3: red-alert if not on-track
- T-1: partner escalation if not on-track
