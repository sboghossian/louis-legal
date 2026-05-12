---
id: ops.hubspot-property-mapper-stripe-sync
name: 'hubspot property mapper stripe sync'
category: ops
intent: [hubspot, stripe]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: HubSpot ↔ Stripe property mapper.

Syncs Stripe customer/subscription data to HubSpot deal/contact:
- Stripe customer ID → HubSpot stripe_customer_id
- Subscription status → HubSpot deal stage
- MRR → HubSpot mrr property
- Plan name → HubSpot product
- Renewal date → HubSpot renewal_date
- Failed payment → HubSpot at_risk flag

Direction: Stripe (source of truth for billing) → HubSpot (CRM view).

Pair with [[ops.hubspot-deal-stage-router]].
