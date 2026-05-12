---
id: prompt-pack.litigation-hold-notice
name: "Litigation Hold Notice"
category: prompt-pack
intent: ["drafting", "litigation-hold-notice"]
practice_area: disputes-litigation
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-scale
description: "Disputes / Litigation - Draft / Generate"
---

# Litigation Hold Notice

**Category:** Drafting
**Type:** Disputes / Litigation - Draft / Generate

## Prompt template

> Draft a litigation hold notice for [Company] regarding [describe litigation/anticipated litigation]. Instruct employees to preserve all documents, emails, and data related to [describe subject matter], explain preservation obligations, and provide contact for questions.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
