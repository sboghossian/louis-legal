---
id: prompt-pack.complex-law-simple-summary
name: "Complex Law → Simple Summary"
category: prompt-pack
intent: ["summarize", "complex-law-simple-summary"]
practice_area: corporate-commercial
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-doc
description: "Corporate / Commercial - Summarize / Extract"
---

# Complex Law → Simple Summary

**Category:** Summarize
**Type:** Corporate / Commercial - Summarize / Extract

## Prompt template

> Summarize the following legal/tax provision in simple language suitable for a client. Include key points, compliance requirements, and practical implications.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
