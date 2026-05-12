---
id: prompt-pack.nda-strength-check
name: "NDA Strength Check"
category: prompt-pack
intent: ["review", "nda-strength-check"]
practice_area: corporate-commercial
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-search
description: "Corporate / Commercial - Review / Redline"
---

# NDA Strength Check

**Category:** Review
**Type:** Corporate / Commercial - Review / Redline

## Prompt template

> Evaluate this Non Disclosure Agreement: [PASTE NDA].

Check whether the agreement properly protects confidential information for [COMPANY NAME].

Review the following areas:

- Definition of confidential information
- Duration of confidentiality obligations
- Permitted disclosures
- Remedies for breach

Identify weaknesses and rewrite the NDA clauses so the protection is stronger and clearer.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
