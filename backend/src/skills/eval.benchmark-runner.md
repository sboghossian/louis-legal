---
id: eval.benchmark-runner
name: Benchmark Runner
category: eval
intent: [__eval__]
priority: P0
status: drafted
version: 0.1
---
Daily benchmark runner — executes the full eval suite against the current production model.

# Pipeline
1. Load all `eval.dataset.*` files (NDA, employment, real-estate, research, adversarial, multilingual)
2. For each prompt:
   - Call production /chat endpoint
   - Record response, latency, tokens used, skills routed
3. For each response:
   - Run all `eval.rubric.*` graders via [[eval.LLM-as-judge-system-prompt]]
   - Compute weighted aggregate score
4. Compare to previous run via [[eval.regression-detector]]
5. Publish results to Langfuse dashboard + [[eval.leaderboard-updater]]

# Trigger
- Daily at 12:00 UTC (matches Stephane's existing schedule)
- On every deployment to staging
- On-demand via Slack `/eval-run`

# Configuration
- Model under test (production vs experimental)
- Dataset subsets to include
- Judge models (ensemble: GPT-4o + Claude Sonnet + Gemini Pro)
- Cost budget per run

# Output
- Per-dataset score
- Aggregate score
- Per-rubric breakdown
- Regression flags (any rubric dropped >5% vs previous)
- Hallucination rate
- Top failing prompts (for triage)

# Critical
- Never grade with the same model family that's being graded (Claude grading Claude has bias)
- Recalibrate against human gold-standard quarterly
- Track *trend* over absolute score — model improvements come in steps
