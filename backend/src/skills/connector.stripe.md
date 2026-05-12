---
id: connector.stripe
name: Connector — Stripe
category: connector
intent: [__connector__]
priority: P0
status: drafted
version: 0.1
---
Stripe (billing) integration.

# Capabilities
- Subscription management (plans, upgrades, downgrades)
- Invoice generation + tax compliance
- Payment method management
- Refund processing (with permissions)
- Customer portal embedding

# Use cases
1. **Plan upgrades** from `/settings → Billing`
2. **In-chat upgrade prompts** ([[unlock.contextual-upsell]])
3. **Invoice download**
4. **Trial conversion**
5. **Failed payment recovery**

# Subscription model
- **Free tier** (no Stripe customer)
- **Starter $9/mo** — 10k credits
- **Pro $49/mo** — 50k credits
- **Business $199/mo** — eFirm features
- **Enterprise** — custom

# Add-ons
- Extra credits packs
- Onboarding services
- Custom integrations

# Tax + compliance
- VAT compliance (UK + EU + UAE 5% + KSA 15%)
- Stripe Tax for automatic calculation
- Invoice in user's local currency where possible

# Webhooks
- Subscription lifecycle events trigger user state updates
- Failed payments trigger dunning emails
- Successful payments trigger plan tier upgrades

# Critical
- **Tenant isolation** — each tenant has own Stripe customer
- **Currency hedging** — multi-currency receivables managed centrally
- **PCI compliance** — Stripe handles; no card details in our systems

See [[connector.hubspot-CRM]] for the upstream lead-to-deal flow.
