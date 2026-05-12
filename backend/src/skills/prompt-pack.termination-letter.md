---
id: prompt-pack.termination-letter
name: "Termination Letter"
category: prompt-pack
intent: ["drafting", "termination-letter"]
practice_area: employment
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-users
description: "Employment - Draft / Generate"
---

# Termination Letter

**Category:** Drafting
**Type:** Employment - Draft / Generate

## Prompt template

> Draft a termination letter for [Employee] at [Company] based on [reason: performance/misconduct/redundancy/without cause]. Include effective date, final pay details, benefits continuation (COBRA if applicable), return of property, and post-employment obligations reminder.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
