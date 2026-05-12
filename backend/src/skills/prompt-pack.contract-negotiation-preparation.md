---
id: prompt-pack.contract-negotiation-preparation
name: "Contract Negotiation Preparation"
category: prompt-pack
intent: ["strategy", "contract-negotiation-preparation"]
practice_area: corporate-commercial
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-sparkles
description: "Corporate / Commercial - Strategy / Scenario"
---

# Contract Negotiation Preparation

**Category:** Strategy
**Type:** Corporate / Commercial - Strategy / Scenario

## Prompt template

> Analyze this contract before negotiation: [PASTE CONTRACT].

Create a negotiation brief for [COMPANY NAME].

Include:

- Clauses that should be renegotiated
- Clauses that should not be changed
- Suggested alternative wording for key provisions
- Questions to ask the other party

Present the output as a clear negotiation checklist.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
