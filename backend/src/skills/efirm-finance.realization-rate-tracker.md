---
id: efirm-finance.realization-rate-tracker
name: 'realization rate tracker'
category: efirm-finance
intent: [realization, billing]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Realization rate tracker.

Metrics:
- Billed realization = billed / worked (write-down %)
- Collected realization = collected / worked (write-down + bad-debt)

Granularity:
- Per attorney
- Per practice
- Per client
- Per matter type

Flags:
- Attorney realization below firm avg (training opportunity / re-pricing)
- Client with chronic write-down (re-price or terminate)
- Matter type with thin margin (re-evaluate AFA structure)

Pair with [[efirm-finance.collection-rate-tracker]] for full revenue-cycle picture.
