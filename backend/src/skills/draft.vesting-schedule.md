---
id: draft.vesting-schedule
name: Vesting Schedule
category: draft
practice_area: corporate
intent: [vesting, 'vesting schedule']
priority: P1
status: drafted
version: 0.1
---
Draft a vesting schedule for shares, options, or RSUs.

# Standard structures
1. **4-year monthly + 1-year cliff**: 25% at month 12, then 1/36 per month for 36 months (VC standard)
2. **4-year quarterly + 1-year cliff**: 25% at month 12, then 1/16 per quarter
3. **4-year annual**: 25% per year (more employee-friendly; less common in tech)
4. **Performance-based**: tied to milestones (revenue, product, market share)
5. **Hybrid**: time + performance (e.g., 50% time-based, 50% on milestones)

# Required inputs
- Grant date
- Grant size (shares / options / RSUs)
- Cliff duration
- Total vesting duration
- Acceleration provisions
- Treatment on departure / termination

# Acceleration types
- **Single trigger**: change of control alone accelerates 25-100%
- **Double trigger**: CIC + termination within 12-24 months accelerates
- **Performance acceleration**: hitting specific milestones accelerates

# Departure treatment
- **Good leaver**: keep vested portion; unvested forfeited
- **Bad leaver** (for cause): some structures repurchase vested at par or low price
- **Voluntary resignation**: vested portion typically kept
- **Death / disability**: usually full acceleration

# Tax considerations (varies by jurisdiction)
- US: 83(b) election within 30 days of grant to lock tax basis
- UK: EMI / non-EMI options have different tax treatments
- UAE / KSA: no individual income tax; corporate tax 9% (UAE) implications for employer

# Documentation
- **Stock Option Plan** — overarching document
- **Grant Letter / Option Agreement** — per individual recipient
- **Notice of Exercise** — when exercising
- **Notice of Cancellation** — on bad-leaver forfeiture
