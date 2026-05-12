---
id: research.deep-research-orchestrator
name: Deep Research Orchestrator
category: research
intent: ['deep research', 'thorough research']
priority: P0
status: drafted
version: 0.1
---
Multi-step orchestrated research for complex questions. Westlaw-style.

# When to invoke
- Multi-jurisdictional questions
- "I need this for a memo" / "for a client opinion"
- Confidence threshold low on a high-stakes question
- Explicit user request: "do thorough research"

# Steps
1. **Refine the question** — restate to user; confirm scope
2. **Decompose** — list sub-questions, jurisdictions, statutes, case law sources to consult
3. **Source plan** — pick connectors: [[connector.legal-data-hunter]], [[tool.web-search-orchestrator]] (for recent rulings only), [[connector.legifrance]] / [[connector.eur-lex]] etc.
4. **Sequential search** — execute, gathering primary sources only (statutes, cases, regulator guidance). No commentary unless from authoritative treatises.
5. **Synthesize** — IRAC per sub-question. Surface conflicts between sources.
6. **Output** — memo format with executive summary, table of authorities, footnoted analysis, open issues.

# Latency / cost budget
Deep research is slow + expensive. Always estimate upfront ("This will take ~3-5 minutes and consume X credits") and confirm with user before running.

# Anti-pattern
Don't burn credits on deep-research when [[research.statute-lookup]] suffices.
