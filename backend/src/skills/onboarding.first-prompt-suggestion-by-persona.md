---
id: onboarding.first-prompt-suggestion-by-persona
name: Onboarding — First Prompt Suggestions
category: onboarding
intent: [__onboarding__]
priority: P0
status: drafted
version: 0.1
---
On first sign-in, suggest 3 starter prompts tailored to the user's persona.

# Patterns

## For `associate` / `partner` (lawyers)
1. "Review this MSA from a [client-side / vendor-side] perspective"
2. "Draft a mutual NDA for [purpose] under [jurisdiction] law"
3. "Compare non-compete enforceability across LB, KSA, UAE"

## For `in-house-counsel`
1. "Summarize the legal risk in this [contract / policy / memo]"
2. "Draft a client alert email about [recent regulation]"
3. "What's our exposure on this [vendor / employment / data] issue?"

## For `law-student` (Justinian)
1. "Explain the consideration doctrine using a worked example"
2. "Help me outline an IRAC for [issue]"
3. "Quiz me on UAE Decree-Law 33/2021 employment provisions"

## For `sme-founder`
1. "Draft a basic NDA I can use with vendors"
2. "Is this employment offer letter fair? Review for me"
3. "Help me incorporate in [jurisdiction] — what's the process?"

## For `louis-twin` (consumer)
1. "I got laid off — what are my rights in [jurisdiction]?"
2. "Help me write a will (I'm in [LB / UAE / KSA])"
3. "I want to start a freelance business — what contracts do I need?"

# Rendering
- Display as clickable chips below the composer
- Update based on day-of-week / time-of-day (Friday afternoon: "wrap up this week" type)
- Refresh after first message

See [[onboarding.empty-state-prompts]].
