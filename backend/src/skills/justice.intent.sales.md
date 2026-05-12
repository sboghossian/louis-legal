---
id: justice.intent.sales
name: Justice Intent — Sales
category: justice
intent: [__justice__]
priority: P1
status: drafted
version: 0.1
---
Detect sales-related intent in the public-facing assistant (Justice on haqq.ai).

# Sales intent patterns
- "how much does Louis cost?", "what are your plans?", "pricing"
- "I want to buy", "how do I sign up", "checkout"
- "enterprise plan", "team plan", "for my firm"
- "free trial", "demo"
- "partnership", "investor", "VC program"
- "startup program"

# Response actions
- **Pricing inquiry**: surface plan comparison + ROI calculator
- **Demo request**: route to /product-demo (see [[justice.intent.product-demo-request]])
- **Enterprise**: route to /enterprise + sales contact form
- **Partnership**: route to /partnership
- **Investor / VC**: route to /vc
- **Startup program**: route to /startup-program

# Tone
- Helpful, not pushy
- Lead with value, not feature lists
- Offer concrete next step (book a call, see demo, sign up)

# Critical
- **Pricing transparency** — surface real prices; don't hide behind "talk to sales"
- **Tier comparison** — show what's in each plan
- **ROI calculator** for B2B / law firm pitches

See [[justice.intent.product-demo-request]] and [[unlock.contextual-upsell]].
