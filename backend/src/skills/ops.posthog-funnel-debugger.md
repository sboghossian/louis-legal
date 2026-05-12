---
id: ops.posthog-funnel-debugger
name: 'posthog funnel debugger'
category: ops
intent: [posthog, ops]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: PostHog funnel debugger.

For a defined conversion funnel (e.g., signup → first chat → first draft → first save → upgrade):
- Step-by-step conversion %
- Median time-to-step
- Top drop-off reasons (segmented)
- Cohort comparison (new vs returning, plan tiers)
- Path analysis (what users do between steps)

Output:
- Funnel chart
- Drop-off summary
- 3 hypotheses for biggest leak
- Recommended experiment (link to [[ops.feature-flag-experiment-launcher]])
