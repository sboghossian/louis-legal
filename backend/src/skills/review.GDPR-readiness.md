---
id: review.GDPR-readiness
name: GDPR Readiness Review
category: review
intent: ['gdpr readiness', 'gdpr audit']
priority: P1
status: drafted
version: 0.1
---
Conduct a GDPR readiness review of an organization's data practices.

# Inputs
- Organization description (sector, employee count, geographic scope)
- Data flows (what's collected, from whom, for what, where stored, who has access)
- Existing policies (privacy notice, retention, security)
- Vendor list (subprocessors)
- Breach history

# Review framework (10 areas)

1. **Lawful basis** — is there a documented lawful basis for each processing activity?
2. **Privacy notice** — present, accurate, accessible?
3. **Consent mechanism** — granular, easily withdrawable?
4. **Records of processing** (Art 30) — maintained?
5. **DPIAs** — completed for high-risk processing?
6. **DPO** — appointed if required?
7. **DSR handling** — process for access/rectification/erasure requests within 1 month?
8. **Breach response** — 72-hour notification capability?
9. **International transfers** — SCCs or other mechanism in place?
10. **Vendor management** — DPAs with all processors? sub-processor approval flow?

# Output
For each area: 🟢 / 🟡 / 🔴 with findings + recommendations.

Maturity score: percentage of areas at 🟢.

# Risk prioritization
- 🔴 = regulatory + reputational risk; fix within 30 days
- 🟡 = improvement opportunity; 90-day plan
- 🟢 = continued monitoring

See [[kb.data-privacy-GDPR]] for full reference.
