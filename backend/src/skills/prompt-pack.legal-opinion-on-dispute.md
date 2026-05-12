---
id: prompt-pack.legal-opinion-on-dispute
name: "Legal Opinion on Dispute"
category: prompt-pack
intent: ["research", "legal-opinion-on-dispute"]
practice_area: disputes-litigation
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-book
description: "Disputes / Litigation - Research / Authorities"
---

# Legal Opinion on Dispute

**Category:** Research
**Type:** Disputes / Litigation - Research / Authorities

## Prompt template

> Prepare a legal opinion for [Client] analyzing the merits of [describe potential claim/defense] under [jurisdiction] law. Assess liability exposure, potential damages, likelihood of success, litigation risks, and recommended course of action.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
