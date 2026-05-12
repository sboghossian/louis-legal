---
id: casesim.outcome-probability-estimator
name: 'outcome probability estimator'
category: casesim
intent: [litigation-prep, settlement]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Casesim — outcome probability estimator.

Estimates likely outcome distribution:
- P(win on liability) × P(damage range) → expected award
- Adjusts for jurisdiction / judge / forum
- Accounts for appeal probability + reversal rate
- Costs (own legal + opposing if loser-pays)
- Time-to-judgment

Output:
- Expected value of trial
- Probability-weighted scenarios (50%, 75%, 90%)
- Reasoned ranges, not single-point estimates

Always disclaim: predictions are estimates, not guarantees. Pair with [[casesim.settlement-vs-trial-EV-calculator]].
