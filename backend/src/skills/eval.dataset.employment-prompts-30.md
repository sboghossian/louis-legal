---
id: eval.dataset.employment-prompts-30
name: Eval Dataset — Employment prompts (30)
category: eval
intent: [__eval__]
priority: P0
status: drafted
version: 0.1
---
Benchmark dataset: 30 employment-law prompts across LB/KSA/UAE/DIFC/UK/EU.

# Categories
1. **Drafting** — employment contracts, offer letters, termination letters, severance, non-compete (10 prompts)
2. **Review** — paste a contract; ask for risks, restrictive-covenant analysis (5 prompts)
3. **Calc** — EOSG/EOSA computation with edge cases (5 prompts)
4. **Advice** — termination scenarios, redundancy, dispute (5 prompts)
5. **Jurisdiction comparison** — non-compete vs LB/KSA/UAE (3 prompts)
6. **Bilingual** — Arabic-input employment requests (2 prompts)

# Use
Same pipeline as [[eval.dataset.NDA-prompts-30]]: run, score, aggregate, regress.

Storage: `eval/datasets/employment-prompts-30.jsonl`
