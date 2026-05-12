---
id: prompt-pack.witness-statement
name: "Witness Statement"
category: prompt-pack
intent: ["drafting", "witness-statement"]
practice_area: disputes-litigation
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Disputes / Litigation - Draft / Generate"
---

# Witness Statement

**Category:** Drafting
**Type:** Disputes / Litigation - Draft / Generate

## Prompt template

> Draft a witness statement for [Witness Name] in [Case Name/Number] covering their knowledge of [describe relevant events/facts]. Include chronological narrative, factual observations, and statement of truth per [jurisdiction] requirements.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
