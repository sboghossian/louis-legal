---
id: router.complexity-grader
name: Complexity Grader
category: router
intent: [__router__]
priority: P0
status: drafted
version: 0.1
---
Grade the request's complexity so downstream can pick model/temperature/tools.

# Buckets
- `short-answer` (≤200 tokens out): one-shot factual ("what's the limitation period for tort in LB?"), greeting, quick yes/no
- `medium` (200–1500 tokens): a clause draft, a review of <2 pages, a single-jurisdiction question
- `deep-research` (1500+ tokens, RAG + web): multi-jurisdiction comparison, recent-amendment lookup, regulatory landscape
- `full-document` (3000+ tokens, structured output): full contract draft, memo of law, due-diligence pack
- `agentic` (multi-step, tools, gates): workflow.* skills like full DD pack, deposition prep, M&A close

# Output
`{"complexity": "<bucket>", "estimated_tokens_out": <int>, "needs_tools": ["rag", "web", "calc", "legal-data-hunter"]}`

# Why this matters
Latency budget on web ≈ 12s for medium, ≤4s for short-answer. Mobile is stricter. Don't escalate to deep-research unless cues are present (multi-jurisdiction terms, "compare", "all options", "thoroughly", "case law search").
