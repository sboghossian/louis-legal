---
id: prompt-pack.statement-of-defense-arbitration
name: "Statement of Defense (Arbitration)"
category: prompt-pack
intent: ["drafting", "statement-of-defense-arbitration"]
practice_area: arbitration
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Arbitration - Draft / Generate"
---

# Statement of Defense (Arbitration)

**Category:** Drafting
**Type:** Arbitration - Draft / Generate

## Prompt template

> Draft a Statement of Defense for [Respondent] in [Arbitration Case Reference] responding to [Claimant's] claims. Address each claim, present defenses, assert any counterclaims of [describe], and request appropriate relief.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
