---
id: prompt-pack.employment-offer-letter
name: "Employment Offer Letter"
category: prompt-pack
intent: ["drafting", "employment-offer-letter"]
practice_area: employment
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-users
description: "Employment - Draft / Generate"
---

# Employment Offer Letter

**Category:** Drafting
**Type:** Employment - Draft / Generate

## Prompt template

> Draft an employment offer letter for [Position] at [Company] under [jurisdiction] law. Include start date, compensation, benefits, reporting structure, at-will or fixed-term status, confidentiality obligations, and conditions of employment.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
