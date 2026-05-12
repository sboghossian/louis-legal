---
id: unlock.contextual-upsell
name: Unlock — Contextual Upsell
category: unlock
intent: [__unlock__]
priority: P0
status: drafted
version: 0.1
---
Surface contextual upsell prompts when user encounters paid features or tier-limited capabilities.

# When to surface
- User on free tier tries:
  - Deep research feature → "Available on Pro"
  - More than X queries/day → "Upgrade for higher limits"
  - eFirm features → "Available on Business plan"
  - Word plugin → "Pro+ feature"
- User on Starter approaches credit limit
- User on Pro approaches business-feature usage

# Pattern
> [Feature you wanted] is available on [Plan]. Get [X benefit] for $[Y]/mo. [Upgrade] [See plans] [Maybe later]

# Calibration
- **Don't push during distress** — see [[conversation.empathy-B2C]]
- **Don't push immediately after sign-up** — give value first
- **Don't push more than once per day**
- **Respect "Maybe later"** for that session
- **Show real ROI** — "Avg Pro user saves 5h/week"

# Conversion triggers
- High value demonstrated (just drafted 12-page MSA — pitch automation features)
- Repeated tier-limit hits in single session
- Heavy usage day

# A/B test
- Different copy variants
- Discount % offered
- "Try Pro free for 14 days" offer

# Critical
- **Lead with value**, not feature lists
- **Specific to context** (the feature they just tried)
- **Clear next step** — upgrade button works

See [[onboarding.upgrade-prompt-when-credits-low]] and [[growth.referral-prompt]].
