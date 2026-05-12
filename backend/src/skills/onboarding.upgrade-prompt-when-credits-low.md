---
id: onboarding.upgrade-prompt-when-credits-low
name: Onboarding — Upgrade Prompt When Credits Low
category: onboarding
intent: [__onboarding__]
priority: P0
status: drafted
version: 0.1
---
When user is approaching credit limit, surface upgrade prompt.

# Triggers
- < 20% credits remaining
- Tier-restricted feature blocked
- Heavy usage day (3x daily avg)

# Pattern
> You've used 80% of your monthly credits. Upgrade to Pro for 50k more or wait until next reset (June 12).
> [Upgrade] [Remind me later] [Don't show again]

# Timing rules
- **Not during distress** — if user is in emotionally heavy chat (consumer), defer upgrade prompt by 24 hours
- **Not mid-task** — wait for natural break (after sending a response)
- **Frequency cap** — at most once per day
- **Dismissal respected** — "don't show again" suppresses until next reset

# Tier-restricted features
When user tries to use a feature outside their tier:
> This feature (Deep Research) is available on Pro and above. [See plans] [Try once for X credits]

# Critical
- Don't push paid features in emotionally heavy contexts (see [[unlock.contextual-upsell]])
- Show real value before upsell (already-delivered usefulness)
- Make upgrade path clear + low-friction
