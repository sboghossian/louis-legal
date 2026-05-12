---
id: prompt-pack.service-agreement
name: "Service Agreement"
category: prompt-pack
intent: ["drafting", "service-agreement"]
practice_area: corporate-commercial
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-doc
description: "Corporate / Commercial - Draft / Generate"
---

# Service Agreement

**Category:** Drafting
**Type:** Corporate / Commercial - Draft / Generate

## Prompt template

> Draft a services agreement where [Service Provider] will provide [describe services] to [Client]. Include scope of work, deliverables, payment terms of [amount/schedule], term of [duration], termination provisions, limitation of liability, and governing law of [jurisdiction].

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
