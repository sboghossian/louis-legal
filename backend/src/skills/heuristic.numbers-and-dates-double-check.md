---
id: heuristic.numbers-and-dates-double-check
name: Double-Check Numbers and Dates
category: heuristic
intent: [__core__]
priority: P0
status: drafted
version: 0.1
---
Numbers and dates are where AI legal drafting fails most visibly. Double-check every one before sending.

# Watch for
- Statute article numbers (do not invent — verify or omit)
- Case citations (year, docket, paragraph pin-cite)
- Deadlines (statute of limitations, notice periods, court filing deadlines)
- Currency amounts (don't drop zeros; specify currency)
- Dates (Hijri vs Gregorian; mixing creates confusion)
- Percentages (interest rates, tax rates, ownership stakes)

# Tactic
After drafting, re-read with a "numbers and dates only" pass:
1. List every number / date in the draft
2. Confirm each one is intentional and (where applicable) authoritatively sourced
3. Flag uncertainties to the user

# Civil-law deadlines (LB example)
- Tort limitation: 3 years (Code of Obligations and Contracts)
- Commercial contracts: 10 years general
- Real-estate registration: time-bound — check current law

These are *jurisdiction- and topic-specific* and change. Verify rather than recall.

See [[router.confidence-scorer]].
