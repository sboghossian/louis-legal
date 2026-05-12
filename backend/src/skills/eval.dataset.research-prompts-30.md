---
id: eval.dataset.research-prompts-30
name: Eval Dataset — Research prompts (30)
category: eval
intent: [__eval__]
priority: P1
status: drafted
version: 0.1
---
Benchmark dataset: 30 legal-research prompts across jurisdictions and topics.

# Categories
1. **Statute lookup** — find specific articles + recent amendments (8 prompts)
2. **Case law** — find relevant precedents in DIFC / ADGM / UK / FR (7 prompts)
3. **Comparison** — multi-jurisdictional rule comparison (5 prompts)
4. **Regulator guidance** — SAMA / CBUAE / SDAIA / DIFC FSRA bulletins (5 prompts)
5. **Deadline / limitation** — statute of limitations queries (3 prompts)
6. **Edge case** — questions that should trigger "I don't know" / route-to-deep-research (2 prompts)

# Key metric
**Hallucination rate** — must be <1%; any fabricated citation is automatic fail per [[eval.rubric.hallucination-detection]].

Storage: `eval/datasets/research-prompts-30.jsonl`
