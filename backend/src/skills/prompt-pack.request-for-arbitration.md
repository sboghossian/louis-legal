---
id: prompt-pack.request-for-arbitration
name: "Request for Arbitration"
category: prompt-pack
intent: ["drafting", "request-for-arbitration"]
practice_area: arbitration
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Arbitration - Draft / Generate"
---

# Request for Arbitration

**Category:** Drafting
**Type:** Arbitration - Draft / Generate

## Prompt template

> Draft a Request for Arbitration to be filed with [arbitration institution] on behalf of [Claimant] against [Respondent] arising from [describe contract/dispute]. Include factual summary, claims, relief sought, proposed arbitrators, and procedural requests.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
