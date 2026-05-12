---
id: prompt-pack.matter-budget-template
name: "Matter Budget Template"
category: prompt-pack
intent: ["operations", "matter-budget-template"]
practice_area: legal-ops-billing
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-folder
description: "Legal Ops / Billing - Operations"
---

# Matter Budget Template

**Category:** Operations
**Type:** Legal Ops / Billing - Operations

## Prompt template

> Create a matter budget template for [type of legal matter] including phase/task breakdowns, estimated hours by timekeeper level, expenses, contingency allowance, and assumptions. Align with [LEDES/UTBMS] billing codes.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
