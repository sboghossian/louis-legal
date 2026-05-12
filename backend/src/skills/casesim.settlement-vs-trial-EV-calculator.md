---
id: casesim.settlement-vs-trial-EV-calculator
name: 'settlement vs trial EV calculator'
category: casesim
intent: [settlement, ev]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Casesim — settlement-vs-trial expected-value calculator.

Inputs:
- Settlement offer
- P(win at trial)
- Damages range at trial (low / median / high)
- Costs to trial (own + opposing if loser-pays)
- Discount rate / time value
- Reputational / strategic factors

Output:
- EV(trial) = Σ probability × (award - costs) discounted
- EV(settlement) = settlement - costs-to-date
- Recommendation: take / counter / decline
- Sensitivity analysis

Frames trade-off explicitly. Always disclaim: probabilistic estimate, not certainty. Pair with [[casesim.outcome-probability-estimator]].
