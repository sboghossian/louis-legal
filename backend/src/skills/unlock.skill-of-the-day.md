---
id: unlock.skill-of-the-day
name: Unlock — Skill of the Day
category: unlock
intent: [__unlock__]
priority: P1
status: drafted
version: 0.1
---
Surface a featured skill daily to power users.

# Pattern
- Each weekday morning, surface one skill from the 973-skill library
- Persona-matched (lawyer sees lawyer skills, student sees Justinian skills, etc.)
- Concrete example use case
- Link to try the skill

# Selection algorithm
1. Filter by user's persona
2. Filter to drafted (real content) skills
3. Avoid already-tried this week
4. Weighted by usage trends (popular skills) + diversity

# Example surfacing
> **Skill of the day**: `draft.shareholders-agreement` (SHA)
>
> Build an SHA for your next startup matter:
> - Equity allocation
> - Reserved matters list
> - Drag/tag rights
> - Vesting + acceleration
>
> [Try it] [Read the skill] [Save for later]

# Distribution
- In-app notification
- Email digest (opt-in)
- Mobile push (opt-in)

# Track
- Click-through rate per skill
- Completion rate (did they use it?)
- Feedback (helpful / not)

# Critical
- **Quality > quantity** — don't surface stubs
- **Contextual relevance** — match to user's current matters / queries
- **Easy dismissal** — don't be annoying
