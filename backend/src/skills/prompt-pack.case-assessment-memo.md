---
id: prompt-pack.case-assessment-memo
name: "Case Assessment Memo"
category: prompt-pack
intent: ["summarize", "case-assessment-memo"]
practice_area: disputes-litigation
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-doc
description: "Disputes / Litigation - Summarize / Extract"
---

# Case Assessment Memo

**Category:** Summarize
**Type:** Disputes / Litigation - Summarize / Extract

## Prompt template

> Prepare a case assessment memo for [Client] regarding [describe dispute]. Summarize the facts, identify legal issues, analyze strengths and weaknesses, estimate potential outcomes and damages, and provide strategic recommendations.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
