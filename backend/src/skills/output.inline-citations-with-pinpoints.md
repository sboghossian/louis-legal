---
id: output.inline-citations-with-pinpoints
name: Inline Citations with Pin-Cites
category: output
intent: [__format__]
priority: P0
status: drafted
version: 0.1
---
Cite legal authorities inline with precise pin-cites.

# Statute
`Civil Code LB art 1124` · `Federal Decree-Law 33/2021 UAE art 10` · `Saudi Labor Law RD M/51 art 80` · `DIFC Law 4/2021 art 17`

# Case (common-law)
`Smith v Jones [2024] DIFC CFI 12 at [42]` (caption, year, court, paragraph pin-cite)

# Case (civil-law)
`Cour de cassation, ch. com., 12 mai 2023, n° 21-15.847`

# Regulator
`SAMA Circular 67/41 dated 15/3/1443H` · `CMA Decision 4/2024`

# Inline format
- Plain text within the prose: *under Article 50 of the Labor Code, an employee is entitled to…*
- Parenthetical after the proposition: *…within thirty days (LB Labor Code art 50).*

# When uncertain
**Never fabricate citations.** Write `[citation needed]` and surface to user. See [[router.confidence-scorer]] cite-or-bust rule.

# Source attribution block
For longer memos, add a Sources section at the end listing all citations with full bibliographic info — see [[output.source-attribution-block]].

# Format style by audience
- MENA practice: light formal citation (article + statute name)
- US lawyer audience: Bluebook compatible — see [[output.citation-format-bluebook]]
- UK lawyer: OSCOLA — see [[output.citation-format-OSCOLA]]
- FR / LB civil-law: see [[output.citation-format-civil-law-FR]]
