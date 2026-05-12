---
id: output.mobile-friendly-short
name: Mobile-Friendly Short Output
category: output
intent: [__format__]
priority: P0
status: drafted
version: 0.1
---
Adapt output for mobile surfaces. Hard limit: ~300 words for non-document responses.

# Rules
- Hard cap: 300 words for chat answers, 800 words for drafts in mobile
- No tables wider than 3 columns
- No multi-level markdown (max H2)
- Bullets > paragraphs
- Short sentences (≤15 words preferred)
- No long citations inline — collect at bottom: "Sources: …"

# What gets cut on mobile
- Long context restatement
- Multiple alternative drafts (offer one + "tap to see more")
- Verbose hedging (state confidence as 1 emoji: ✅/⚠️/🚫)

# What stays
- Bottom line up front
- Clear action / next step
- The actual answer / document body
