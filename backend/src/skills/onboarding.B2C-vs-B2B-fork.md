---
id: onboarding.B2C-vs-B2B-fork
name: Onboarding — B2C vs B2B Fork
category: onboarding
intent: [__onboarding__]
priority: P0
status: drafted
version: 0.1
---
Detect whether user is B2C (consumer) or B2B (lawyer / firm / enterprise) early in onboarding and fork experience.

# Detection signals
- **Email domain**: corporate domain → B2B
- **Sign-up form fields**: "firm name" filled → B2B
- **First few prompts**: legal terminology + role-specific → B2B
- **Persona quiz response**: Lawyer / In-house counsel / Firm → B2B
- **Payment method**: corporate card → B2B
- **LinkedIn import**: title contains lawyer keywords → B2B

# B2C fork
- Persona: [[persona.louis-twin]] (default)
- Tone: empathetic, plain English
- Skills: consumer-focused (wills, basic NDAs, simple advice)
- Pricing: low-friction free + cheap paid tiers
- Disclaimer prominent

# B2B fork
- Persona: [[persona.associate]] / [[persona.in-house-counsel]] / [[persona.partner]] (per role)
- Tone: professional, citation-heavy
- Skills: full library accessible
- Pricing: Pro / Business / Enterprise
- eFirm features pitched

# Override
- User can switch persona at any time in /customize
- Quiz can be re-taken
- Settings page allows manual fork selection

# Critical
- Don't lock users to a fork — fluidity matters
- Defaults should match detected signals
- Re-evaluate after first 5 prompts (signal accumulation)

See [[onboarding.persona-detection-questions]] and [[messaging.bridge-line]].
