---
id: prompt-pack.due-diligence-report
name: "Due Diligence Report"
category: prompt-pack
intent: ["summarize", "due-diligence-report"]
practice_area: corporate-m-a
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-doc
description: "Corporate / M&A - Summarize / Extract"
---

# Due Diligence Report

**Category:** Summarize
**Type:** Corporate / M&A - Summarize / Extract

## Prompt template

> Prepare a legal due diligence report on [Target Company] for [Client]. Summarize key findings, identify material risks, highlight red flags requiring attention, provide risk ratings, and recommend mitigation measures or deal protections.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
