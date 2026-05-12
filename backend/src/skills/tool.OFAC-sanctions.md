---
id: tool.OFAC-sanctions
name: 'OFAC sanctions'
category: tool
intent: [sanctions, screening]
jurisdictions: [US, __multi__]
priority: P1
status: drafted
version: 0.2
---

Tool: OFAC SDN list sanctions screening (US Treasury).

Use OFAC's Specially Designated Nationals (SDN) list to screen:
- Counterparty entities (LLC, Ltd, JSC) and individuals
- Beneficial owners (UBOs) above 25% threshold (OFAC 50% Rule)
- Vessels, aircraft, addresses associated with SDNs
- Sectoral Sanctions Identifications (SSI) for Russia / Venezuela / etc.

Match rules:
- Fuzzy name match with transliteration (Latin ↔ Cyrillic ↔ Arabic)
- DOB ± 2 years tolerance
- Address normalization (PO Box variations, etc.)

Output: { hits: [{ name, score, programs, lastUpdated, alternateSpellings }], cleared: bool }

Always couple with [[tool.UN-sanctions]] and [[tool.EU-sanctions]] for full screen.
Citation: refer to OFAC FAQ §401 for the 50% Rule.
