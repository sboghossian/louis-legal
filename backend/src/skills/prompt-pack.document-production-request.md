---
id: prompt-pack.document-production-request
name: "Document Production Request"
category: prompt-pack
intent: ["drafting", "document-production-request"]
practice_area: arbitration
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Arbitration - Draft / Generate"
---

# Document Production Request

**Category:** Drafting
**Type:** Arbitration - Draft / Generate

## Prompt template

> Draft document production requests for [Party] in [Arbitration Case Reference] following the Redfern Schedule format. For each request, specify the document category, relevance to case, materiality, and why documents are not otherwise available.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
