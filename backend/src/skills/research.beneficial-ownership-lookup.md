---
id: research.beneficial-ownership-lookup
name: 'beneficial ownership lookup'
category: research
intent: [ubo, kyc]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Beneficial Ownership (UBO) research.

Goal: pierce nominee / holding-structure layers to identify natural-person UBOs at 25% threshold (FATF standard).

Approach:
1. Pull primary registry record from jurisdiction (UK Companies House PSC, UAE DED + free-zone registers, KSA MOC, Lebanon Commercial Register, BVI/Cayman beneficial-owner secure registers via filing agent).
2. For each shareholder, recurse: is shareholder a natural person? If entity, repeat.
3. Cross-check with leak databases (ICIJ Offshore Leaks, Panama Papers, Paradise Papers, Pandora Papers) for known nominees.
4. Build ownership chain → output as graph.

Output: { rootEntity, ubos: [{ name, percentage, path: [entityChain], confidence }], unresolvedNodes: [...] }

Caveats:
- Some jurisdictions (Delaware US-LLC, BVI BC) don't publish UBO publicly — requires nominee director cooperation or court order
- "Indirect control" (voting agreements, options) often hidden — flag for client follow-up
