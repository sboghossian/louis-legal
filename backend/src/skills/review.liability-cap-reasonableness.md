---
id: review.liability-cap-reasonableness
name: Liability Cap Reasonableness
category: review
intent: ['liability cap', 'cap on damages']
priority: P0
status: drafted
version: 0.1
---
Assess whether a contract's liability cap is reasonable for the deal type and risk profile.

# Cap structures (in increasing order of indemnified-party-friendly)
1. Fees paid in preceding 12 months (Provider-favored — common in commercial services)
2. Fees paid in preceding 24 months
3. 2x annual fees
4. Total contract value
5. Specified absolute amount (USD/AED/EUR)
6. Uncapped

# Reasonableness factors
- **Contract value** — caps should scale with the value being protected
- **Data sensitivity** — uncapped data-breach is now common
- **IP at stake** — uncapped IP indemnity in vendor agreements
- **Length** — for multi-year, 12-month cap leaves long tail uncapped
- **Insurance** — Indemnifying Party's insurance limits may form natural cap floor
- **Jurisdiction** — some jurisdictions disregard caps for gross negligence / willful misconduct

# Common carve-outs (should NOT count against the general cap)
- Breach of confidentiality
- IP indemnification
- Willful misconduct, fraud, gross negligence
- Data-breach related damages (esp. with regulatory penalties)
- Death or personal injury
- Indemnification obligations themselves (avoid circular cap)

# Anti-patterns to flag
- 12-month fees cap on a 5-year contract → leaves 4 years uncapped
- Same cap applies to all damages including IP indemnity → vendor has no IP risk
- "Reasonable" fees cap not defined numerically
- Cap applies to data-breach + regulatory fines (GDPR fines can be 4% of global revenue — verify)

# Output
- Current cap and structure
- Reasonableness rating (1-5)
- Recommended position (ideal / acceptable / walk-away)
- Compare to market for that contract type + jurisdiction
