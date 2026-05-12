---
id: eval.dataset.NDA-prompts-30
name: Eval Dataset — NDA prompts (30)
category: eval
intent: [__eval__]
priority: P0
status: drafted
version: 0.1
---
Benchmark dataset: 30 NDA-related prompts spanning drafting, review, intake, and edge cases.

# Categories (~5 each)
1. **Standard draft** — mutual NDA, unilateral NDA across LB/KSA/UAE/DIFC/FR/UK
2. **Review** — paste a draft NDA, ask for redlines, find issues
3. **Intake** — ambiguous request, model should ask clarifiers
4. **Edge cases** — overly broad definition of confidential info; unrealistic 99-year term; no governing law specified
5. **Bilingual** — Arabic-English split, side-by-side
6. **Multi-party** — 3+ parties; consortium-style NDAs

# How to use
1. Run all 30 against the deployed model
2. Score each output against [[eval.rubric.legal-soundness]] + [[eval.rubric.citation-quality]] + [[eval.rubric.jurisdiction-awareness]] + [[eval.rubric.completeness]]
3. Aggregate scores; track week-over-week trend in [[eval.regression-detector]]

# Storage
Dataset lives in `eval/datasets/NDA-prompts-30.jsonl` (one prompt per line with `id`, `prompt`, `category`, `expected_signals`).
