---
id: justice.intent.competitor-comparison
name: Justice Intent — Competitor Comparison
category: justice
intent: [__justice__]
priority: P1
status: drafted
version: 0.1
---
Detect when user asks how Louis compares to competitors.

# Patterns
- "How does Louis compare to Harvey?"
- "vs Spellbook / Legora / CoCounsel"
- "Why Louis instead of ChatGPT?"
- "Difference between Louis and [competitor]"

# Response actions
- Route to `/compare-us` for canonical comparison
- Provide brief positioning vs named competitor
- Surface MENA-specific advantages (jurisdictional coverage, Arabic support, local KB)
- Avoid disparaging competitors directly

# Key positioning points
- **vs Harvey**: Harvey strong on AmLaw100; Louis strong on MENA + multi-jurisdiction + cost-effective
- **vs Legora**: Legora EU-focused; Louis MENA + Arabic
- **vs Spellbook**: Spellbook Word-plugin focused; Louis full workbench + workspace
- **vs CoCounsel**: CoCounsel TR-affiliated, US-focused; Louis independent, MENA-rooted
- **vs ChatGPT / Claude raw**: Louis pre-loaded with legal skills, jurisdictional knowledge, doc workspace

# Honest differentiation
- We focus on MENA — strongest there
- Multi-language including Arabic
- Built-with-lawyer + bar-rule aware
- Skills-system architecture (modular, customizable)

# Banned moves
- Don't fabricate competitor weaknesses
- Don't claim functional parity if it doesn't exist
- Don't bash — focus on positioning

See [[messaging.bridge-line]] for tone framework.
