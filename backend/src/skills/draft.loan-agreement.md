---
id: draft.loan-agreement
name: Loan Agreement
category: draft
practice_area: banking
intent: ['loan agreement', 'facility agreement']
priority: P0
status: drafted
version: 0.1
---
Draft a Loan Agreement / Facility Agreement.

# Required inputs
- Lender + Borrower (+ Guarantor(s) if any)
- Principal amount + currency
- Interest rate + payment schedule
- Tenor (term)
- Repayment schedule (bullet, amortizing, balloon)
- Security (none / collateral list)
- Governing law

# Structure
1. Definitions (Drawdown Date, Availability Period, Interest Period, etc.)
2. The Facility — amount, type (term / revolving)
3. Purpose — use of proceeds (working capital, acquisition, refinancing)
4. Conditions Precedent — what must be true before drawdown
5. Drawdown mechanics — notice, certificate
6. Interest — base rate (e.g., EIBOR / SAIBOR / SOFR + margin), reset frequency
7. Repayment — schedule, prepayment rights (with/without penalty), mandatory prepayment events
8. Fees — arrangement / commitment / agency
9. Representations — corporate authority, solvency, no material litigation, financial statements accurate
10. Covenants — affirmative (financial reporting, compliance), negative (no additional indebtedness, no asset disposals beyond threshold), financial (DSCR, leverage ratio)
11. Events of Default — non-payment, breach of covenants, cross-default, insolvency, material adverse change
12. Acceleration + remedies
13. Security (cross-reference to security documents)
14. Governing law + dispute resolution

# Jurisdictional notes
- **KSA**: Sharia-compliant structures preferred — restructure as murabaha (cost-plus), ijara (lease), tawarruq, or mudaraba; interest characterized as profit/fee
- **UAE federal**: usury caps apply (Federal Law 18/1993 amendments); commercial rate negotiable
- **DIFC / ADGM**: full common-law facility agreements (LMA-style)
- **LB**: civil-law structure; commercial interest negotiable; statutory cap applicability fact-specific

# Common Provider/Borrower tension
- Financial covenants — tightness vs flexibility
- Negative covenants — scope and thresholds
- Material adverse change — narrow vs broad definition
- Cross-default — to specified amount vs any amount
- Acceleration triggers — automatic vs at Lender's option

See [[draft.guarantee]] and [[draft.security-agreement]].
