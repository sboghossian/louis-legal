---
id: prompt-pack.employment-contract-compliance-review
name: "Employment Contract Compliance Review"
category: prompt-pack
intent: ["review", "employment-contract-compliance-review"]
practice_area: employment
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-search
description: "Employment - Review / Redline"
---

# Employment Contract Compliance Review

**Category:** Review
**Type:** Employment - Review / Redline

## Prompt template

> Review this employment contract for legal and operational issues: [PASTE CONTRACT].

Check the following:

- Non compete and non solicitation clauses
- Intellectual property ownership
- Termination terms and notice periods
- Compensation structure and obligations

Flag anything that may cause legal disputes and propose improved wording.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
