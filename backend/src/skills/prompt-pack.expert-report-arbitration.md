---
id: prompt-pack.expert-report-arbitration
name: "Expert Report (Arbitration)"
category: prompt-pack
intent: ["drafting", "expert-report-arbitration"]
practice_area: arbitration
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Arbitration - Draft / Generate"
---

# Expert Report (Arbitration)

**Category:** Drafting
**Type:** Arbitration - Draft / Generate

## Prompt template

> Prepare an outline for an expert report on [subject matter: damages/technical/industry practice] in [Arbitration Case Reference]. Include expert qualifications, methodology, data analyzed, opinions, and compliance with [IBA Rules/institutional requirements].

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
