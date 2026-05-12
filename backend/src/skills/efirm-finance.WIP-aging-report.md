---
id: efirm-finance.WIP-aging-report
name: 'WIP aging report'
category: efirm-finance
intent: [wip, finance]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Work-in-progress (WIP) aging report.

Lists all unbilled time + expenses grouped by:
- Age bucket (0-30, 31-60, 61-90, 91-180, 180+)
- Matter
- Responsible attorney
- Client
- Practice area

Highlights:
- WIP at risk (older than firm policy threshold)
- Clients with WIP > defined limit (suggests interim bill)
- Stale WIP (older than 90 days — write-off candidate)
- Realization risk (matters with low fee-cap remaining)

Output: dashboard + drill-down + email-draft to partners with action items.
