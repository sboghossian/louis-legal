---
id: prompt-pack.disclosure-letter
name: "Disclosure Letter"
category: prompt-pack
intent: ["drafting", "disclosure-letter"]
practice_area: corporate-m-a
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-globe
description: "Corporate / M&A - Draft / Generate"
---

# Disclosure Letter

**Category:** Drafting
**Type:** Corporate / M&A - Draft / Generate

## Prompt template

> Draft a disclosure letter from [Seller] to [Buyer] in connection with the [SPA/Asset Purchase Agreement]. Include general disclosures, specific disclosures against each representation, material contracts schedule, and exceptions to warranties.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
