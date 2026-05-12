---
id: prompt-pack.severance-agreement
name: "Severance Agreement"
category: prompt-pack
intent: ["drafting", "severance-agreement"]
practice_area: employment
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-users
description: "Employment - Draft / Generate"
---

# Severance Agreement

**Category:** Drafting
**Type:** Employment - Draft / Generate

## Prompt template

> Draft a severance agreement for [Employee] departing [Company]. Include severance amount, payment schedule, benefits continuation, release of claims, non-disparagement, confidentiality, cooperation clause, and required statutory language per [jurisdiction].

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
