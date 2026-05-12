---
id: prompt-pack.contract-summary-for-executives
name: "Contract Summary for Executives"
category: prompt-pack
intent: ["summarize", "contract-summary-for-executives"]
practice_area: corporate-commercial
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-doc
description: "Corporate / Commercial - Summarize / Extract"
---

# Contract Summary for Executives

**Category:** Summarize
**Type:** Corporate / Commercial - Summarize / Extract

## Prompt template

> Summarize the following contract for a busy executive: [PASTE CONTRACT].

Create a one page briefing with these sections:

- Purpose of the agreement
- Key obligations for each party
- Financial commitments
- Legal risks
- Termination conditions

Write the summary in simple language so a non lawyer can understand the agreement in under three minutes.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
