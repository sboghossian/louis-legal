---
id: output.timeline-builder
name: Timeline Builder
category: output
intent: [__format__]
priority: P1
status: drafted
version: 0.1
---
Format output as a chronological timeline for litigation, M&A, or complex matters.

# Format
```
2024-01-15  Discovery call between Acme and Globex
2024-02-20  NDA executed (Mutual)
2024-04-10  Due diligence kicked off
2024-05-22  Term sheet signed
2024-07-30  Definitive agreement signed
2024-08-15  Regulatory filing submitted
2024-10-01  Closing
2024-10-30  Earnout-period start
```

# Variants
- **Compact list** — date + description (default)
- **Annotated** — date + description + supporting documents
- **With deadlines** — flag upcoming deadlines with severity
- **Multi-track** — parallel tracks (e.g., regulatory + diligence + financing)

# When to use
- Litigation chronology
- M&A deal timeline
- Regulatory filing milestones
- Contract performance / breach narratives
- Witness statement support
- Statute of limitations analysis

# Pair with
[[draft.litigation-complaint]] · [[draft.witness-statement]] · [[heuristic.numbers-and-dates-double-check]]
