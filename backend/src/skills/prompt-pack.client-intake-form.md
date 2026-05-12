---
id: prompt-pack.client-intake-form
name: "Client Intake Form"
category: prompt-pack
intent: ["operations", "client-intake-form"]
practice_area: legal-ops-billing
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-folder
description: "Legal Ops / Billing - Operations"
---

# Client Intake Form

**Category:** Operations
**Type:** Legal Ops / Billing - Operations

## Prompt template

> Create a client intake form for [Law Firm/Legal Department] to capture essential information for new matters including client details, matter description, conflict check information, document collection, urgency assessment, and initial budget estimate.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
