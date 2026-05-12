---
id: conversation.intake-power-of-attorney
name: 'intake power of attorney'
category: conversation
intent: [intake, poa]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Intake conversation — Power of Attorney.

1. Principal (grantor — name, ID, residence, jurisdiction)
2. Attorney-in-fact (agent — name, ID, relationship)
3. Scope:
   - General (all powers) vs special (specific transactions)
   - Real estate / banking / litigation / business management
4. Duration (specific date range / event-conditional / durable)
5. Cross-border use (apostille / legalization needed?)
6. MENA notarization (KSA MOJ Najiz, UAE Notary Department, Lebanon Notary, etc.)
7. Revocability
8. Successor agent
9. Special instructions / limits

Output: intake summary + jurisdiction-specific draft via [[draft.power-of-attorney]] + notarization checklist.

Critical for cross-border MENA: apostille (Hague Convention member) vs MOFA legalization (non-member like KSA pre-2018, now apostille-accepted).
