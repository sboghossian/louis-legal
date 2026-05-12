---
id: prompt-pack.contract-playbook
name: "Contract Playbook"
category: prompt-pack
intent: ["drafting", "contract-playbook"]
practice_area: legal-ops-billing
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-bar
description: "Legal Ops / Billing - Draft / Generate"
---

# Contract Playbook

**Category:** Drafting
**Type:** Legal Ops / Billing - Draft / Generate

## Prompt template

> Create a contract playbook for [type of agreement] at [Company] covering standard positions, fallback positions, red lines, approval requirements, and negotiation guidance for key clauses including [list 5-7 key clauses].

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
