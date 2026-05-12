---
id: prompt-pack.settlement-agreement
name: "Settlement Agreement"
category: prompt-pack
intent: ["drafting", "settlement-agreement"]
practice_area: disputes-litigation
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Disputes / Litigation - Draft / Generate"
---

# Settlement Agreement

**Category:** Drafting
**Type:** Disputes / Litigation - Draft / Generate

## Prompt template

> Draft a settlement agreement resolving the dispute between [Party A] and [Party B] arising from [describe dispute/litigation]. Include settlement amount, payment terms, mutual releases, confidentiality, non-disparagement, and dismissal of pending claims.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
