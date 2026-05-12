---
id: prompt-pack.motion-for-summary-judgment
name: "Motion for Summary Judgment"
category: prompt-pack
intent: ["drafting", "motion-for-summary-judgment"]
practice_area: disputes-litigation
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Disputes / Litigation - Draft / Generate"
---

# Motion for Summary Judgment

**Category:** Drafting
**Type:** Disputes / Litigation - Draft / Generate

## Prompt template

> Draft a motion for summary judgment for [Client] in [Case Name/Number] arguing that no genuine issues of material fact exist regarding [describe claims/defenses] and [Client] is entitled to judgment as a matter of law.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
