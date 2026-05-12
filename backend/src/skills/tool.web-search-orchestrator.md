---
id: tool.web-search-orchestrator
name: Tool — Web Search Orchestrator
category: tool
intent: ['web search', 'search the web']
priority: P0
status: drafted
version: 0.1
---
Orchestrate web searches efficiently — batch multiple queries into one tool call where possible.

# When invoked
- Freshness required (last 6 months: recent amendments, rulings, regulator bulletins)
- Source-allowlisted (official gov, regulators, top legal publishers)
- Local KB doesn't cover the question

# Don't invoke for
- Statute text already in model training (use [[research.statute-lookup]])
- Generic legal concepts (model knows)
- Pure boilerplate generation

# Source allowlist (preferred order)
1. Official gazettes (al-Jarida Al-Rasmiya, Umm Al-Qura, Federal Gazette)
2. Regulator websites (SAMA, CBUAE, BDL, DIFC, ADGM, CMA, SDAIA)
3. Court databases (DIFC Courts, ADGM Courts)
4. Top legal publishers (Practical Law, Lexis, Westlaw, AL-Bayan)
5. Bar associations
6. Top legal blogs (Out-Law, Kluwer Arbitration Blog) — secondary source

# Anti-patterns
- Wikipedia for legal authority — wrong for primary sources
- News aggregators as primary — verify with the official source
- Forums / Reddit — never as legal authority

# Output structure
Per result: URL, snippet, date, source-type (primary/regulator/secondary/news), relevance.
