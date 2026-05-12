---
id: efirm-finance.budget-vs-actual-matter
name: 'budget vs actual matter'
category: efirm-finance
intent: [budget, matter]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Budget-vs-actual matter dashboard.

For each matter with a budget:
- Budget by phase
- Actual hours + fees by phase
- Variance (% and absolute)
- Burn rate (hrs / week vs budget pace)
- Projected total at completion
- Action: refile bill, request budget increase, write off, accelerate close

Triggers an alert when:
- >80% of budget consumed
- Burn rate exceeds plan by 25%
- Phase complete but budget under-consumed (carry-forward opportunity)
- Phase exceeded budget (escalation)

Output: dashboard + partner email draft.
