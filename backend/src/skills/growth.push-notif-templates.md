---
id: growth.push-notif-templates
name: Growth — Push Notification Templates
category: growth
intent: [__growth__]
priority: P0
status: drafted
version: 0.1
---
Templates for push notifications across the Louis mobile app.

# Notification types + templates

## Re-engagement (inactive user)
- "Your matters miss you. 3 new updates waiting." (after 3 days)
- "Quick legal question? Louis is ready in 1 tap." (after 7 days)
- "Try the new [feature]. Built for you." (after 14 days)

## Matter-specific
- "Acme MSA closing in 3 days — review checklist?"
- "Deadline tomorrow: response to Khoury complaint"
- "Your client just signed the NDA — what's next?"

## Skills router
- "Try /draft NDA — saves you 20 minutes"
- "Did you know Louis routes 973 specialized skills?"

## Skills of the day
- "Today's featured skill: draft.shareholders-agreement"

## Credit warnings
- "20% credits left this month"
- "Out of credits — upgrade or wait for reset"

## Comments + collaboration
- "Lazar commented on Acme MSA"
- "New approval pending in Drafting Board"

# Best practices
- **One CTA per notification** — clarity
- **Specific over generic** — "Acme MSA" not "your document"
- **Time-zone aware** — don't notify at 3am local
- **Frequency cap** — max 3/day; prefer 1/day on average
- **Personalized** — use matter / chat context, not generic

# Channels
- iOS APNs
- Android FCM
- Web push (in-browser)
- Email digest (lower frequency, higher info density)

# Critical
- Respect user notification preferences (see [[/settings → Notifications]])
- Honor quiet hours
- Quick unsubscribe path
- A/B test variants

See [[growth.email-onboarding-sequence]] for email equivalents.
