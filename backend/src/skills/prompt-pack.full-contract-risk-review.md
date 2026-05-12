---
id: prompt-pack.full-contract-risk-review
name: "Full Contract Risk Review"
category: prompt-pack
intent: ["review", "full-contract-risk-review"]
practice_area: corporate-commercial
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-search
description: "Corporate / Commercial - Review / Redline"
---

# Full Contract Risk Review

**Category:** Review
**Type:** Corporate / Commercial - Review / Redline

## Prompt template

> Review the following contract: [PASTE CONTRACT TEXT OR ATTACH FILE].

Identify legal risks, unclear clauses, missing protections, and terms that may expose [COMPANY NAME] to financial or legal liability.

Provide a structured report with these sections:

- High risk clauses
- Unclear or ambiguous language
- Missing protections for [COMPANY NAME]
- Clauses that strongly favor the other party
- Suggested revisions in plain English

End with a short summary of the top risks.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
