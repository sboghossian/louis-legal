---
id: prompt-pack.arbitration-cost-submission
name: "Arbitration Cost Submission"
category: prompt-pack
intent: ["drafting", "arbitration-cost-submission"]
practice_area: arbitration
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Arbitration - Draft / Generate"
---

# Arbitration Cost Submission

**Category:** Drafting
**Type:** Arbitration - Draft / Generate

## Prompt template

> Draft a costs submission for [Party] in [Arbitration Case Reference] seeking recovery of legal costs and expenses. Include detailed breakdown of legal fees, expert fees, arbitration costs, and other expenses with supporting documentation and applicable cost principles.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
