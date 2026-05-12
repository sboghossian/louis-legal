---
id: conversation.intake-loan-agreement
name: 'intake loan agreement'
category: conversation
intent: [intake]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Intake conversation — loan agreement.

1. Lender + Borrower (entities or individuals; CR / ID numbers)
2. Principal amount + currency
3. Disbursement (lump sum / tranches)
4. Repayment (term, schedule, balloon)
5. Interest (rate, basis, day-count) — Sharia carve-out for Islamic finance (use murabaha / ijarah / sukuk if interest-free required)
6. Security (mortgage / pledge / personal guarantee / corporate guarantee)
7. Covenants (financial / operational / negative)
8. Events of default + acceleration
9. Cross-default / cross-acceleration
10. Governing law + DR + jurisdiction
11. Bank-secrecy / data-protection
12. Tax (withholding, gross-up)

Output: intake summary + Islamic vs conventional structure recommendation + draft request via [[draft.loan-agreement]].
