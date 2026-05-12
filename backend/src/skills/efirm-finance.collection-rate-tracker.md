---
id: efirm-finance.collection-rate-tracker
name: 'collection rate tracker'
category: efirm-finance
intent: [collection, ar]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Collection rate tracker.

Tracks billed-to-collected ratio across:
- Client
- Practice area
- Attorney
- Time period (month / quarter / YTD)
- Aging bucket

Metrics:
- Collection % (paid / billed)
- Days Sales Outstanding (DSO)
- Write-down %
- Trend vs prior period

Identifies:
- Clients with deteriorating collection trend (early-warning signal)
- Matters with disputed billings
- Stale AR (>120 days; chase or write-off)

Output: dashboard + AR-chase email-draft pipeline.
