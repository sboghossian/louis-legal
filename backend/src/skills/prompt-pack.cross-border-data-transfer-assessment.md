---
id: prompt-pack.cross-border-data-transfer-assessment
name: "Cross-Border Data Transfer Assessment"
category: prompt-pack
intent: ["compliance", "cross-border-data-transfer-assessment"]
practice_area: privacy-data-protection
priority: P2
status: drafted
version: 0.1
source: "haqq.ai/prompt-library (scraped 2026-04-29)"
icon: i-shield
description: "Privacy & Data Protection - Compliance / Due Diligence"
---

# Cross-Border Data Transfer Assessment

**Category:** Compliance
**Type:** Privacy & Data Protection - Compliance / Due Diligence

## Prompt template

> Assess the lawfulness of transferring personal data from [origin country/region] to [destination country]. Analyze adequacy decisions, appropriate safeguards (SCCs, BCRs), supplementary measures needed, and risks per Schrems II requirements.

## Usage notes

This is an expert-crafted prompt template from the HAQQ prompt library, imported as a Louis prompt-pack skill.

- Use `[bracketed]` placeholders as inputs to elicit from the user via [[conversation.clarifying-questions]] before sending.
- Apply the relevant `draft.*` or `review.*` skill alongside this template for full structural guidance.
- For jurisdiction-specific adaptations, layer [[heuristic.always-state-jurisdiction-first]] and [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].
