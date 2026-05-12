---
id: tool.UN-sanctions
name: 'UN sanctions'
category: tool
intent: [sanctions, screening]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Tool: UN Consolidated Sanctions List screening.

The UN Security Council Consolidated List combines all UN sanctions programs (1267/1989/2253 ISIL & Al-Qaida, 1718 DPRK, 1737/2231 Iran, 1572 Côte d'Ivoire, 1591 Sudan, 1718, etc.).

For MENA-region transactions UN list is the authoritative baseline — most GCC central banks (CBUAE, SAMA, BDL, CBI, CBK, CBO, CBB, QCB) mirror it.

Match rules:
- Arabic transliteration normalization (e.g., 'Muhammad' / 'Mohammad' / 'Muhamad')
- DOB tolerance
- Vessel IMO numbers exact-match

Always pair with [[tool.OFAC-sanctions]] (US-doing-business), [[tool.EU-sanctions]] (EU nexus).
Reference: https://main.un.org/securitycouncil/en/content/un-sc-consolidated-list
