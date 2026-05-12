---
id: router.tier-aware
name: Tier-Aware Gating
category: router
intent: [__router__]
priority: P0
status: drafted
version: 0.1
---
Respect the user's plan tier and credit balance. Always degrade gracefully.

# Tiers
- `free` — limited credits, no RAG over private corpus, no deep-research, web-search rate-limited
- `starter` — credits, RAG-personal, light deep-research
- `pro` — full RAG, deep-research, all calculators, exports
- `business` — adds eFirm features (matter, billing, team)
- `enterprise` — adds SSO, audit, on-prem KB, dedicated support

# Behavior
- Below threshold (e.g., free user hitting paid feature): do NOT silently refuse. Explain what they're missing and surface upgrade CTA via [[unlock.contextual-upsell]].
- Credit warnings: at <20% credits, inline one-line warning at end of response.
- At 0 credits: hard refuse with a one-line CTA; never silently degrade output quality.

# Output to downstream
`{"tier": "<id>", "credits_remaining": <int>, "features_available": [...], "features_blocked": [...]}`
