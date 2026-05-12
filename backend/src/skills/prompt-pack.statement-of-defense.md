---
id: prompt-pack.statement-of-defense
name: "Statement of Defense"
category: prompt-pack
intent: ["drafting", "statement-of-defense"]
practice_area: disputes-litigation
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Disputes / Litigation - Draft / Generate"
---

# Statement of Defense

**Category:** Drafting
**Type:** Disputes / Litigation - Draft / Generate

## Prompt template

> Draft a statement of defense for [Defendant] responding to [Claimant's] claim filed in [Court/Case Number]. Address each allegation, assert defenses including [describe defenses], and include any counterclaims.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
