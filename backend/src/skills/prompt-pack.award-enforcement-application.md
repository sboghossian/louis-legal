---
id: prompt-pack.award-enforcement-application
name: "Award Enforcement Application"
category: prompt-pack
intent: ["drafting", "award-enforcement-application"]
practice_area: arbitration
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Arbitration - Draft / Generate"
---

# Award Enforcement Application

**Category:** Drafting
**Type:** Arbitration - Draft / Generate

## Prompt template

> Draft an application to enforce [arbitral award] in [jurisdiction] under the New York Convention. Include certified copies of award and arbitration agreement, address enforcement requirements, and anticipate potential grounds for refusal.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
