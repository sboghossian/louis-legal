---
id: eval.regression-detector
name: Regression Detector
category: eval
intent: [__eval__]
priority: P0
status: drafted
version: 0.1
---
Detect regressions in AI quality across deployments.

# Rules
- Any rubric score drops >5% vs previous deployment → alert
- Hallucination rate increases >0.5% → alert
- Latency p95 increases >20% → alert
- Cost-per-message increases >15% → alert

# Outputs
- Slack alert to #eng-quality with diff
- Linear ticket auto-created with regression context
- Block automatic deployment if blocking-rubric regresses

# Investigation flow
1. Identify which prompts regressed
2. Compare current vs previous responses side-by-side
3. Inspect which skills routed differently
4. Check for model API changes / config drift
5. Rollback if severity warrants

# Critical
Connect to PostHog + Langfuse for full observability surface.

See [[eval.benchmark-runner]] and [[eval.LLM-as-judge-system-prompt]].
