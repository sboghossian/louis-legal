---
id: efirm.fee-quote-builder
name: eFirm: Fee Quote Builder
category: efirm
intent: ['fee quote', 'billing structure']
priority: P0
status: drafted
version: 0.1
---
Build a fee quote / fee proposal.

# Structures
1. **Hourly** — rates by seniority; estimate + ceiling
2. **Fixed fee** — single sum for defined deliverable; scope tightly defined
3. **Contingency** — % of recovery; only on litigation/recovery work; bar-rule restrictions in many jurisdictions
4. **Capped fee** — hourly up to a cap; exposes firm to overrun risk
5. **Collared fee** — hourly with floor + ceiling (risk-sharing)
6. **Milestone-based** — installments tied to deliverable milestones
7. **Subscription** — monthly retainer for ongoing advisory work
8. **Hybrid** — fixed for routine + hourly for non-routine

# Quote contents
1. Matter scope (precise, with in/out items)
2. Fee structure choice + rationale
3. Estimate (with assumptions + scope limits)
4. Out-of-pocket expenses pass-through
5. Trust / retainer requirements
6. Billing cadence
7. Tax (VAT) treatment
8. Adjustment mechanism for scope changes
9. Validity (offer expires)

# Anti-patterns
- "Hourly, see attached rate card" with no estimate — clients hate this
- Fixed fees without tight scope — creates disputes
- Promising specific outcomes — bar rules
- Contingency without checking jurisdiction rules

# Saudi / MENA-specific
- KSA: contingency disfavoured for many matters
- UAE: client funds in escrow rules apply to retainers
- LB: bar caps on certain fee structures

See [[efirm.engagement-letter-draft]] for the contract that documents the agreed quote.
