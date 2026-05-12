---
id: prompt-pack.open-source-compliance-review
name: "Open Source Compliance Review"
category: prompt-pack
intent: ["review", "open-source-compliance-review"]
practice_area: ip-licensing
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-search
description: "IP / Licensing - Review / Redline"
---

# Open Source Compliance Review

**Category:** Review
**Type:** IP / Licensing - Review / Redline

## Prompt template

> Conduct an open source license compliance review for [Company's] software product. Identify all open source components, classify license types (permissive, copyleft), assess compatibility, flag compliance risks, and recommend remediation steps.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
