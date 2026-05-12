---
id: safety.synthetic-witness-flagger
name: 'synthetic witness flagger'
category: safety
intent: [safety, evidence]
jurisdictions: [__multi__]
priority: P0
status: drafted
version: 0.2
---

Skill: Safety — synthetic-witness flagger.

When user submits a deposition transcript / witness statement / sworn declaration:
- Style heuristics: identical phrasing across multiple witnesses (boilerplate-rotation indicator)
- LLM-generated tells: smoothed prose, hedged language, lack of specific concrete detail
- Inconsistency check with other case documents
- Date / location inconsistencies
- Improbable level of recall (verbatim conversations from years ago)

Louis output:
- Flag specific anomalies without making conclusions
- "Consider deposition follow-up on items X / Y / Z to test recall"
- Suggest forensic-linguistics expert for high-stakes use

NEVER label a witness statement "fake" — flag for human investigation.
