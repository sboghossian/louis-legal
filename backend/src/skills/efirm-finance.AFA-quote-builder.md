---
id: efirm-finance.AFA-quote-builder
name: 'AFA quote builder'
category: efirm-finance
intent: [pricing, afa]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: AFA (Alternative Fee Arrangement) quote builder.

For a given matter, generates fee proposals across:
- **Fixed fee**: flat fee per phase (intake / drafting / negotiation / close)
- **Capped fee**: hourly with hard cap; over-cap discount
- **Blended rate**: weighted-average across team (partner + associate + paralegal)
- **Success fee**: contingent percentage tied to outcome (deal close, judgment, settlement)
- **Retainer + retainer-credit**: monthly retainer, credit against hourly
- **Subscription**: monthly all-you-can-eat for in-house counsel work
- **Volume discount**: tiered by volume of work

Inputs: matter type, complexity, urgency, jurisdiction, team mix, comparable historic matters.

Output:
- 3 quote variations
- Range estimate per phase
- Sensitivity analysis
- Risk-shared upside/downside framing
- Comparison vs hourly baseline (% discount expected)
