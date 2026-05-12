---
id: ops.hubspot-deal-stage-router
name: 'hubspot deal stage router'
category: ops
intent: [hubspot, ops]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: HubSpot deal stage router.

Maps Louis events → HubSpot deal stages:
- Signup → "Trial Start"
- First successful contract draft → "Demo Complete"
- Upload first matter file → "POC Active"
- 30+ days active → "Sales-Qualified Lead"
- Upgrade to paid → "Closed-Won"
- Cancel → "Closed-Lost"

Triggers HubSpot workflows:
- SQL → assigns to AE
- Closed-Won → onboarding email sequence
- Closed-Lost → win-back sequence (90 days)

Pair with [[ops.hubspot-property-mapper-stripe-sync]] for billing-linked field sync.
