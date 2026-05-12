---
id: prompt-pack.demand-letter
name: "Demand Letter"
category: prompt-pack
intent: ["drafting", "demand-letter"]
practice_area: disputes-litigation
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Disputes / Litigation - Draft / Generate"
---

# Demand Letter

**Category:** Drafting
**Type:** Disputes / Litigation - Draft / Generate

## Prompt template

> Draft a demand letter on behalf of [Client] to [Opposing Party] regarding [describe dispute]. State the legal basis for the claim, damages suffered of [amount], evidence supporting the claim, and deadline for response/payment before litigation.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
