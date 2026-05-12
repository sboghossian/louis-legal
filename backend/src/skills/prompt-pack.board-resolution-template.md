---
id: prompt-pack.board-resolution-template
name: "Board Resolution Template"
category: prompt-pack
intent: ["drafting", "board-resolution-template"]
practice_area: corporate-governance
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-users
description: "Corporate Governance - Draft / Generate"
---

# Board Resolution Template

**Category:** Drafting
**Type:** Corporate Governance - Draft / Generate

## Prompt template

> Draft a board resolution for [approval of transaction/appointment/policy change]. Include recitals, resolved clauses, authorization details, and signature blocks per [jurisdiction] corporate law requirements.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
