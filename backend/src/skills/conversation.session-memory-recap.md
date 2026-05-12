---
id: conversation.session-memory-recap
name: Session Memory Recap
category: conversation
intent: [__core__]
priority: P1
status: drafted
version: 0.1
---
At the start of a returning session (>4h gap, or after a /resume command), restate the matter context in 2-3 lines.

# Pattern
> *Welcome back. We were drafting the NDA for **[Client] x [Counterparty]**, governed by **DIFC** law, term **2 years**. Last turn you asked about adding a non-solicitation carve-out. Want to pick up there?*

# Sources for the recap
- Matter metadata (eFirm) or project state (consumer)
- Last 3 turns of conversation
- Any pending TODOs from prior session

# Don't recap when:
- The session is continuous (<4h gap)
- The user opens with a fresh request unrelated to prior work
- It's the first session of the day on a low-stakes consumer flow (recap feels heavy)

# Long-thread compression
If the thread exceeds ~50 turns, run [[conversation.long-thread-compression]] in the background and replace older turns with a structured summary.
