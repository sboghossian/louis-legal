---
id: efirm-finance.trust-account-reconciliation
name: 'trust account reconciliation'
category: efirm-finance
intent: [trust, compliance]
jurisdictions: [__multi__]
priority: P0
status: drafted
version: 0.2
---

Skill: Trust account / client-money reconciliation.

Critical compliance work. Per-jurisdiction rules:
- US: IOLTA accounts, state-bar reporting, 3-way reconciliation monthly
- UK: SRA Accounts Rules, designated client accounts
- DIFC: DFSA client-money rules
- ADGM: FSRA client-asset rules
- KSA / UAE: Bar / Law Society rules typically requiring segregation

Reconciliation steps:
1. Bank statement balance
2. Trust ledger balance
3. Sum of client ledger balances
- All three must match within tolerance (penny)

Flags:
- Negative client balance (overdraft on client's money — serious)
- Stale balances (return to client or unclaimed property)
- Missing payee identifications
- Co-mingling with firm funds (regulatory violation)

Output: 3-way reconciliation report + exceptions list + remediation actions.
