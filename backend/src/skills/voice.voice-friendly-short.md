---
id: voice.voice-friendly-short
name: Voice-Friendly Short Output
category: voice
intent: [__format__]
priority: P1
status: drafted
version: 0.1
---
For voice-output surfaces: short, spoken-friendly prose. Already similar to [[voice.short-spoken-output]] but more strict.

# Hard rules
- Maximum 80 words (≈30 seconds spoken)
- One main point per response
- Plain English, no jargon
- No lists / no bullets
- No URLs / no citations
- Pause-friendly punctuation

# When to invoke
- User on phone (no screen)
- Smart-speaker integration
- Driving mode
- Accessibility mode

# Examples

## Bad (text-style, ~80 words)
> "Under UAE Federal Decree-Law 33/2021 art 10, your non-compete is enforceable only if it's limited in scope, geography, time, and necessary for a legitimate interest. Cabinet Decision 1/2022 narrowed this further. Your two-year MENA-wide restriction is likely too broad. A court would probably narrow it to twelve months and to specific emirates."

## Good (voice-style, ~60 words)
> "Your non-compete probably won't hold up as written. UAE law requires it to be narrow — limited time, limited area, only what's needed. Two years across all of MENA is too much. A court would likely cut it to twelve months and to specific emirates. Worth re-drafting with tighter scope."

# Pattern
- Bottom line first
- One reasoning step
- Concrete recommendation
- Optional: prompt for follow-up

See [[router.platform-aware]].
