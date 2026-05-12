---
id: research.case-law-search
name: Case Law Search
category: research
intent: ['case law', 'find cases', 'case search']
priority: P0
status: drafted
version: 0.1
---
Search for case law by jurisdiction. Pipe through the right data source.

# Pipeline
1. **Identify jurisdiction** ([[router.jurisdiction-detector]])
2. **Identify legal issue** — be specific (not "labor law" but "non-compete enforceability post-Decree-Law 33/2021")
3. **Source selection**:
   - LB: lebanese cassation reports, Al-Adliya bulletin, [[connector.legal-data-hunter]]
   - KSA: Najiz (MOJ public rulings), [[connector.legal-data-hunter]]
   - UAE: DIFC Courts case database, ADGM Courts, Dubai Courts public rulings, [[connector.legal-data-hunter]]
   - FR: [[connector.legifrance]], [[tool.google-scholar-legal]]
   - EU: [[connector.eur-lex]]
   - US: [[tool.courtlistener-US]], [[connector.SEC-EDGAR]] for securities
   - UK: BAILII via [[tool.web-search-orchestrator]]

# Output structure
For each case:
- Caption + court + year + docket
- Brief facts (2-3 sentences)
- Holding (1 sentence)
- Relevant principle (1-2 sentences)
- Pin-cite paragraph if available
- Distinguishing facts (when comparing to user's situation)

# Anti-pattern
**Never invent case citations.** If no real case is found, say so. See [[router.confidence-scorer]] cite-or-bust rule.

# Recent rulings
For amendments / recent decisions, run [[research.recent-amendments-tracker]] alongside.
