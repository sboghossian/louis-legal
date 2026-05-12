---
id: growth.NPS-prompt
name: Growth — NPS Prompt
category: growth
intent: [__growth__]
priority: P1
status: drafted
version: 0.1
---
Survey users with Net Promoter Score periodically.

# When to ask
- 30 days after sign-up
- After 5 successful tasks
- Quarterly for retained users
- After major product release

# Format
- "On a scale of 0-10, how likely are you to recommend Louis to a colleague?"
- Follow-up: "What's the main reason for your score?"
- Optional: ask permission to follow up with specific feedback

# Scoring
- 9-10: **Promoters** — happy, refer them, ask for case study + testimonial
- 7-8: **Passives** — satisfied but not enthusiastic; investigate gap
- 0-6: **Detractors** — at risk; route to CS for follow-up

# Calculation
- NPS = % Promoters - % Detractors
- Industry benchmarks: SaaS averages 30-50; world-class 70+

# Use
- Track over time (monthly, quarterly)
- Segment by persona (lawyer NPS vs consumer NPS)
- Segment by feature usage (heavy doc workspace users vs casual users)
- Correlate with churn, expansion, referrals

# Anti-pattern
- **Ask too often** — survey fatigue; 90-day minimum gap
- **No follow-through** — if you ask, act on it
- **Use NPS as sole metric** — qualitative feedback matters too
- **Punish detractors with more nags** — give them a clear path to resolution

See [[ops.NPS-collector-in-chat]] for inline implementation.
