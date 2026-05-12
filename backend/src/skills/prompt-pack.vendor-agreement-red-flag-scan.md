---
id: prompt-pack.vendor-agreement-red-flag-scan
name: "Vendor Agreement Red Flag Scan"
category: prompt-pack
intent: ["review", "vendor-agreement-red-flag-scan"]
practice_area: corporate-commercial
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-search
description: "Corporate / Commercial - Review / Redline"
---

# Vendor Agreement Red Flag Scan

**Category:** Review
**Type:** Corporate / Commercial - Review / Redline

## Prompt template

> Analyze this vendor agreement: [PASTE AGREEMENT].

Focus on payment terms, liability limits, termination conditions, intellectual property ownership, and service obligations.

Explain:

- Clauses that may create financial exposure
- Terms that restrict flexibility or exit options
- Any unusual or one sided conditions

Then rewrite the risky clauses with safer alternatives suitable for [COMPANY NAME].

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
