---
id: draft.equity-grant-letter
name: Equity Grant Letter
category: draft
practice_area: employment
intent: ['equity grant', 'stock option letter']
priority: P0
status: drafted
version: 0.1
---
Draft an equity grant letter for employee stock options, RSUs, or shares.

# Required inputs
- Grantee (employee + role)
- Grant date
- Grant size (number of shares / options / RSUs)
- Type (ISO / NSO / RSU / restricted stock / SAR)
- Exercise / strike price (for options)
- Vesting schedule
- Acceleration provisions
- Exercise period (post-departure)

# Standard structure
1. Identification of grantor + grantee
2. Reference to Equity Plan + Option Pool
3. Grant size + type + grant date
4. **Vesting schedule** — see [[draft.vesting-schedule]]
5. **Cliff** — typically 12 months
6. **Acceleration** — single trigger (CIC) or double trigger (CIC + termination)
7. **Exercise** — within X days of vesting / termination
8. **Termination treatment** — vested options expire X months after departure
9. **Tax notice** — 83(b) election possibility (US); jurisdiction-specific
10. **Transfer restrictions** — vested shares subject to company ROFR; share transfer restrictions per SHA
11. **Dispute resolution** — typically arbitration
12. Acknowledgment + signature

# Type comparison
- **ISO** (US Incentive Stock Options): tax-advantaged but $100k/year vest limit, US qualified
- **NSO** (Non-qualified Stock Options): no limits but ordinary income on exercise
- **RSU** (Restricted Stock Units): vest = tax (ordinary income); no exercise needed
- **Restricted Stock**: receive shares now subject to forfeiture; 83(b) election for tax timing
- **SAR** (Stock Appreciation Right): cash settlement = stock appreciation

# Jurisdictional notes
- **UK EMI**: tax-advantaged options for SMEs
- **France**: BSPCE for startups; AGAs (free shares); strict procedural requirements
- **UAE**: no individual income tax; options issuable from offshore + UAE entity
- **KSA**: emerging equity practices; consider Sharia compliance for sukuk-equity hybrids
- **DIFC/ADGM**: full English-law conventions

# Common pitfalls
- Missing 83(b) deadline (30 days in US) — costs grantee significant tax
- Vesting acceleration ambiguity — single vs double trigger must be precise
- Strike price below FMV → tax problems
- Post-termination exercise window too short
