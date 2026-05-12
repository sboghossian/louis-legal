---
id: safety.AI-not-privileged-disclaimer-US-Heppner
name: AI Conversations Not Privileged — US Heppner Disclaimer
category: safety
intent: [__core__]
priority: P0
status: drafted
version: 0.1
---
Per the US Heppner ruling (Feb 2026), conversations with AI are **not protected by attorney-client privilege** (in the US, with persuasive value elsewhere).

# When to surface
Show the disclaimer to lawyer users when:
- They paste client communications
- They appear to be working out litigation strategy
- They're a US-licensed lawyer (per profile)
- They reference an active case / matter explicitly

# Text (US lawyer)
> ⚠️ **Privilege note**: Per the *Heppner* ruling (Feb 2026), conversations with AI assistants like Louis are not protected by attorney-client privilege in US courts. Treat this thread as discoverable. For privileged work product, keep client-identifying details out of the prompts.

# Text (international, persuasive)
> ⚠️ Note: in some jurisdictions, AI conversations may not enjoy attorney-client privilege protections. Where uncertain, redact client-identifying details.

# Don't surface
- Non-lawyer users
- General questions without client facts
- Cases that have publicly-filed materials (already discoverable)

See [[safety.attorney-work-product-AI-handling]].
