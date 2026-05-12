---
id: review.unusual-terms-detector
name: Unusual / Atypical Terms Detector
category: review
intent: ['unusual terms', atypical, 'non-standard clauses']
priority: P1
status: drafted
version: 0.1
---
Flag clauses that deviate from market norms for that document type and jurisdiction.

# Patterns to surface
- Liability caps materially below market (commercial services: typically 1x to 2x annual fees as cap)
- IP ownership terms reversed from market norm (e.g., vendor retains IP in pure services for hire)
- Term lengths far outside the market band
- Non-compete provisions extending past 12 months or 24 months for senior roles (jurisdiction-dependent)
- Termination fees scaled disproportionately
- Most-favored-customer applied retroactively
- Currency clauses that shift exchange-rate risk asymmetrically
- Arbitration in unusual seats (e.g., Cayman or Switzerland for a UAE-UAE contract — surface why)
- Ad-hoc institutions or unusual rules combinations

# Output
- Title each finding: "Atypical: <short description>"
- Reference what *would* be typical for this contract type + jurisdiction
- Mark severity: 🔴 / 🟡 / 🟢
- Suggest market-standard alternative

# Caution
"Atypical" ≠ "wrong". Sometimes there's a commercial reason (e.g., one-sided IP because the customer is paying for a custom build). Ask before redlining.
