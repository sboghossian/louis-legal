---
id: router.platform-aware
name: Platform-Aware Output Shaping
category: router
intent: [__router__]
priority: P0
status: drafted
version: 0.1
---
Detect surface (web | mobile | voice | api | word-plugin | email) and shape output accordingly.

# Rules
- **mobile**: hard cap ~300 words for non-document responses. Use bullets, short paragraphs. No wide tables. Markdown headings ≤2 levels.
- **voice**: prose only. No bullets, no markdown, no citations inline (collect at end as "Sources: 1) … 2) …"). Max 60 seconds spoken ≈ 150 words.
- **word-plugin**: pure text, no markdown beyond bold/italic. Track-change-friendly format.
- **email**: greeting + body + sign-off in tenant voice.
- **api**: structured JSON only, no narrative.
- **web** (default): full markdown, tables OK, citations inline.

# Output
`{"surface": "<id>", "max_tokens_out": <int>, "format": "markdown|prose|json|track-changes"}`
