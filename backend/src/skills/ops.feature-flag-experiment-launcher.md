---
id: ops.feature-flag-experiment-launcher
name: 'feature flag experiment launcher'
category: ops
intent: [feature-flag, experiment]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Feature-flag experiment launcher.

Given a hypothesis:
- Define metric (primary + 2 guardrails)
- Define cohort (% / segment / opt-in)
- Define duration + power (sample size needed)
- Create flag in feature-flag system
- Wire flag in code
- Configure PostHog event + flag-variant tracking
- Define stop-loss (auto-revert if guardrail drops >X%)

Outputs to PostHog or LaunchDarkly. Pair with [[ops.posthog-funnel-debugger]].
