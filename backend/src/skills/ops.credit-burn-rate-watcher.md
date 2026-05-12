---
id: ops.credit-burn-rate-watcher
name: 'credit burn rate watcher'
category: ops
intent: [credits, ops]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Credit / token burn-rate watcher.

For each tenant + matter:
- Tokens consumed per turn (Gemini / Claude / GPT-4 / etc.)
- $ cost per turn
- Burn rate trend

Alerts:
- Tenant approaches plan limit (T-7 days at current rate)
- Matter abnormal burn (deep-research multi-hop on inefficient model)
- Cost-per-turn drift upward (model selection issue or prompt bloat)

Optimization suggestions:
- Switch routine queries to Gemini Flash from Claude Opus
- Reuse cached responses
- Trim system-prompt skill composition (use [[ops.skill-router-prompt-bloat-watcher]])

Output: dashboard + ops alert + customer-facing usage email.
