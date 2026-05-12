---
id: prompt-pack.witness-statement-arbitration
name: "Witness Statement (Arbitration)"
category: prompt-pack
intent: ["drafting", "witness-statement-arbitration"]
practice_area: arbitration
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Arbitration - Draft / Generate"
---

# Witness Statement (Arbitration)

**Category:** Drafting
**Type:** Arbitration - Draft / Generate

## Prompt template

> Draft a witness statement for [Witness Name/Role] in [Arbitration Case Reference] following [IBA Rules on Taking of Evidence/institutional rules]. Include background, factual narrative, exhibits referenced, and statement of truth.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
