---
id: ops.subscription-erd-validator
name: 'subscription erd validator'
category: ops
intent: [subscription, ops]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Subscription ERD validator.

Cross-checks the subscription data model:
- Stripe customer ↔ User: 1-1 or 1-many?
- Subscription ↔ Tenant: 1-1 required
- Plan ↔ Feature flags: rules consistent
- Invoice ↔ Usage: matches metering

Flags inconsistencies:
- Orphan Stripe customer (no Louis user)
- Active subscription without active user
- User with multiple active subscriptions
- Plan downgrade in middle of cycle (proration mismatch)

Used by [[ops.error-classifier]] when billing-related errors appear.
