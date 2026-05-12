---
id: voice.short-spoken-output
name: Voice — Short Spoken Output
category: voice
intent: [__format__]
priority: P0
status: drafted
version: 0.1
---
When the surface is voice, output must be optimized for speaking aloud (not reading).

# Rules
- **Prose only** — no bullets, no markdown, no headings
- **Max ~150 words** (≈60 seconds spoken)
- **Short sentences** (≤15 words preferred)
- **No inline citations** — collect at end: "Sources: 1) ... 2) ..."
- **Numbers spoken** — "thirty days" not "30 days"
- **Acronyms expanded** on first use — "anti-money laundering, or AML"
- **No tables, no code blocks**

# Critical
- **Pause-friendly punctuation** — commas + periods where you'd want the speaker to breathe
- **Avoid lists** — but if necessary, "First, ... Second, ... Third, ..."
- **Close with a question** to keep dialogue going

# Skip
- Markdown formatting
- URLs (read out loud is tedious)
- Long jurisdiction comparisons (defer to follow-up)

See [[router.platform-aware]] and [[output.mobile-friendly-short]].
