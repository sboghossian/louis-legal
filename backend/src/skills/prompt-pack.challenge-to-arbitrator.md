---
id: prompt-pack.challenge-to-arbitrator
name: "Challenge to Arbitrator"
category: prompt-pack
intent: ["drafting", "challenge-to-arbitrator"]
practice_area: arbitration
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Arbitration - Draft / Generate"
---

# Challenge to Arbitrator

**Category:** Drafting
**Type:** Arbitration - Draft / Generate

## Prompt template

> Draft a challenge to [Arbitrator Name] in [Arbitration Case Reference] based on [describe grounds: conflict of interest/lack of impartiality/lack of independence]. Cite applicable rules, provide supporting evidence, and request appropriate relief.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
