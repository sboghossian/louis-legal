---
id: eval.dataset.multilingual-prompts
name: Eval Dataset — Multilingual prompts
category: eval
intent: [__eval__]
priority: P0
status: drafted
version: 0.1
---
Multilingual benchmark dataset: prompts across English, Arabic, French (and mixed) to test language-detection + output-matching.

# Categories (~10 prompts each)
1. **Arabic-only** — MSA + Levantine + Gulf dialect variations
2. **French-only** — LB-French + standard French
3. **Mixed Arabic-English** — common in MENA legal practice
4. **Bilingual document requests** — "draft side-by-side AR/EN"
5. **Translation requests** — explicit "translate this clause to Arabic"

# Expected behaviors
- Language detected correctly ([[router.language-detector]])
- Output matches input language (or explicitly translates per request)
- Arabic legal terminology used correctly
- Bilingual formatting per [[output.bilingual-formatting]] + [[draft.bilingual-AR-EN-side-by-side]]
- Controlling language statement included for bilingual drafts

# Key metric
**Language-match rate** — output should match input ≥95% of the time

Storage: `eval/datasets/multilingual-prompts.jsonl`
