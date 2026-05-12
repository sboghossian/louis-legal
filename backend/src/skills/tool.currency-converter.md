---
id: tool.currency-converter
name: 'currency converter'
category: tool
intent: [calculator, currency]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Tool: Currency converter (spot + historical).

- Spot rates: USD, EUR, GBP, AED, SAR, LBP, KWD, QAR, BHD, OMR, EGP, JPY, CNY
- Historical: pick date for FX-as-of valuation (key for past-damages calculations)
- Lebanese Pound caveat: official rate (LBP 15,000 / USD post-Feb 2023 unification) vs Sayrafa vs parallel market — Louis defaults to BDL official unless flagged

Input: { from, to, amount, asOfDate (optional) }
Output: { converted, rateUsed, rateSource, advisoryFlags }

Important: damages calculations in Lebanese contracts pre-2019 often need expert testimony to fix the "lawful" rate — surface this caveat.
