---
id: prompt-pack.standard-nda
name: "Standard NDA"
category: prompt-pack
intent: ["drafting", "standard-nda"]
practice_area: corporate-commercial
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-doc
description: "Corporate / Commercial - Draft / Generate"
---

# Standard NDA

**Category:** Drafting
**Type:** Corporate / Commercial - Draft / Generate

## Prompt template

> Draft a mutual non-disclosure agreement between [Party A] and [Party B] for the purpose of evaluating a potential [describe transaction or project]. Include standard confidentiality obligations, permitted disclosures, term of [X] years, and governing law of [jurisdiction].

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
