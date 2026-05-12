---
id: prompt-pack.contract-risk-matrix
name: "Contract Risk Matrix"
category: prompt-pack
intent: ["review", "contract-risk-matrix"]
practice_area: corporate-commercial
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-search
description: "Corporate / Commercial - Review / Redline"
---

# Contract Risk Matrix

**Category:** Review
**Type:** Corporate / Commercial - Review / Redline

## Prompt template

> Analyze the attached contract and create a risk matrix categorizing each clause by risk level (low/medium/high/critical). For each risk, provide the clause reference, risk description, potential impact, likelihood, and recommended mitigation action.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
