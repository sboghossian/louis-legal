---
id: onboarding.feature-discovery-tour
name: Onboarding — Feature Discovery Tour
category: onboarding
intent: [__onboarding__]
priority: P1
status: drafted
version: 0.1
---
Guided tour of Louis features on first sign-in. Optional, skippable.

# Tour steps (modal sequence)
1. **Welcome** — Louis introduces itself, sets expectations
2. **Composer demo** — type a sample prompt; show categories
3. **Doc workspace tease** — "Upload a contract and Louis can review it"
4. **Skills library** — "Louis routes 973 specialized skills based on your request"
5. **Customize** — "Tailor the assistant to your workflow"
6. **Drafting board** — "For complex multi-step legal work"
7. **Done** — start screen

# Triggers
- First sign-in
- After 7 days inactive (re-engagement)
- New major feature launch

# Anti-pattern
- Don't lock UI behind tour
- Allow skip on every step
- Don't repeat tour after dismissal
- Don't show tour mid-task

See [[unlock.first-week-progressive-tour]] for the longer-arc onboarding.
