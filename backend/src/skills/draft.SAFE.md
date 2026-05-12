---
id: draft.SAFE
name: SAFE (Simple Agreement for Future Equity)
category: draft
practice_area: corporate
intent: [safe, 'future equity']
priority: P0
status: drafted
version: 0.1
---
Draft a SAFE per the Y Combinator standard, adapted for jurisdiction.

# Required inputs
- Company (name, jurisdiction of incorporation)
- Investor (name, entity)
- Purchase amount (in cash, the SAFE consideration)
- Valuation cap (post-money, typical 2026)
- Discount rate (optional — 15-25% typical)
- MFN (most-favored-nation) provision (default yes)
- Pro-rata side letter (separate, optional)

# Key clauses
1. **Definitions** — Equity Financing, Liquidity Event, Dissolution, Conversion Price, Valuation Cap
2. **Conversion** — automatic on next priced Equity Financing; conversion price = lesser of (a) Valuation Cap / Company Capitalization (post-money definition), (b) Discount × per-share price
3. **Liquidity event** — pro-rata distribution at the cap-implied price
4. **Dissolution** — return of purchase amount before junior holders, after creditors
5. **MFN** — if Company issues subsequent SAFE on better terms within 12 months, Investor gets the better terms automatically

# Jurisdictional adaptations
- **DIFC / ADGM / Delaware**: standard YC post-money SAFE works
- **LB / FR**: civil-law adaptation needed — SAFE is a hybrid instrument; in LB, characterize as "promesse de souscription" with conversion mechanic
- **KSA**: simple convertible debt structure may be preferable to avoid Sharia ambiguity around future-equity instruments

# Critical
SAFEs are NOT loans (no maturity, no interest). Don't draft them as convertible notes. If parties want maturity + interest → use [[draft.convertible-note]].
