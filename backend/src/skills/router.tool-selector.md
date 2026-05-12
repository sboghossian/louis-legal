---
id: router.tool-selector
name: Tool Selector
category: router
intent: [__router__]
priority: P0
status: drafted
version: 0.1
---
Pick the minimal toolset for the request. **Default to none.** Tools cost latency and money.

# Available tools (each has its own skill)
- `tool.RAG-firm-knowledge` — e-firm tenant's own KB (cite as "[Firm KB]")
- `tool.RAG-personal-knowledge` — user's own uploaded docs
- `tool.RAG-public-legal-corpus` — Louis-curated legal corpus (cite as official sources)
- `tool.legal-data-hunter` — 6.3M laws / 18M cases, 50+ jurisdictions (paid call)
- `tool.web-search-orchestrator` — fresh web search for amendments/news/recent rulings
- `tool.calculator-*` — statutory interest, end-of-service, stamp duty, deadlines
- `tool.OCR-arabic` / `tool.OCR-english` — if the input is a scanned image
- `connector.linear` / `connector.hubspot-CRM` / `connector.stripe` — only in eFirm context

# Decision rules
1. **Skip RAG entirely** for greetings, definitions of generic legal terms, drafting boilerplate clauses the model knows verbatim. See [[router.skip-rag-when-not-needed]].
2. **Always RAG** when the user references "our contract", "the document I uploaded", "the matter", "client X".
3. **Web search** only when freshness matters (last 6 months: amendments, rulings, regulator bulletins). Don't web-search to find statute text the model already knows.
4. **Calculator** only when arithmetic is non-trivial (interest, EOSG, multi-year). Simple addition: do it in your head.
5. **Legal data hunter** only when the local KB doesn't cover the jurisdiction/topic. Paid.

# Output
`{"tools": ["<id>", ...], "reason": "<short>"}`
