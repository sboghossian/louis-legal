---
id: growth.referral-prompt
name: Growth — Referral Prompts
category: growth
intent: [__growth__]
priority: P0
status: drafted
version: 0.1
---
Prompt happy users to refer others.

# When to ask
- After a successful drafting / review session
- After NPS score 9-10
- After 30 days active usage
- After paid plan upgrade

# Don't ask
- After error / refund / negative experience
- Within 24h of distress matter
- Repeatedly (cap: once per 30 days)

# Prompt patterns

## Soft (in-chat)
> "If Louis is saving you time, share with a colleague? You'll both get +50% credits."
> [Share link] [Maybe later]

## Email
- Subject: "Know a lawyer who'd love Louis?"
- Personalized referral link
- Reward explanation
- Optional pre-written share copy

## In-app modal
- Triggered post-successful-task
- Visual: gift icon + reward
- Tooltip explaining mutual benefit

# Reward structures
- **AI tier (consumer)**: +50% credits each, on first paid month
- **eFirm tier (B2B)**: free month each, on first month after signup
- **Cumulative**: cap at 6 referrals / year

# Critical
- **Mutual benefit** matters — referral recipient also gets value
- **Easy share path** — pre-written copy + link in 1 tap
- **Track referrals** — see [[/referral]] page

See [[/referral]] for the page + [[unlock.contextual-upsell]] for related patterns.
