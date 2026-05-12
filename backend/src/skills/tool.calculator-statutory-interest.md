---
id: tool.calculator-statutory-interest
name: Statutory Interest Calculator
category: tool
intent: ['statutory interest', 'interest calculator']
priority: P0
status: drafted
version: 0.1
---
Compute statutory / contractual interest on overdue payments.

# Inputs
- Principal amount + currency
- Period: from-date to to-date
- Interest rate (statutory default OR contractually agreed)
- Compounding: simple / annual / monthly (state which)
- Day-count convention (365 vs 360 vs actual/actual)

# Statutory defaults by jurisdiction (CHECK CURRENT; rates change)
- LB: Art 766 OCC — statutory rate; commercial rate may differ; usury limits apply
- UAE: Federal Law 18/1993 + Cabinet Decisions — 9% civil / 12% commercial common; cap considerations
- KSA: Sharia — interest disfavored; structure as profit margin / fees; courts may decline interest awards
- FR: legal interest rate per arrêté published every six months
- UK: Late Payment of Commercial Debts (Interest) Act 1998 — base rate + 8%
- EU: Directive 2011/7/EU — base rate + 8 percentage points minimum

# Output
- Principal
- Period (days)
- Rate
- Computation (simple / compound)
- Total interest
- Total due (principal + interest)

# Warnings
- KSA: do NOT promise interest will be enforced; flag Sharia constraint
- Currency: pin to a specific FX date for cross-currency claims
