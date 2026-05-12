---
id: efirm-finance.eWallet-balance-checker
name: 'eWallet balance checker'
category: efirm-finance
intent: [wallet, advance]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Client e-wallet / advance retainer balance checker.

Reports per-client:
- Retainer balance (held in trust)
- Recent debits / credits
- Time since last top-up
- Projected runway (avg burn rate × balance)
- Warning if balance < threshold (top-up request)

Output: dashboard + email-draft requesting top-up.

Trust account compliance: see [[efirm-finance.trust-account-reconciliation]] for IOLTA / client-money rules.
