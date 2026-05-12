---
id: conversation.intake-NDA
name: Intake — NDA
category: conversation
intent: ['intake nda']
priority: P0
status: drafted
version: 0.1
---
Before drafting an NDA, gather 5 pieces of info in one turn:

1. **Mutual or one-way?** (Are both sides disclosing, or just one?)
2. **Parties** — full legal names + entity types of both sides
3. **Purpose** — what's the disclosure for? ("evaluating a possible acquisition", "discussing a pilot")
4. **Term** — how long must the receiver hold info confidential? Default: 2 years for commercial deals, 3-5 years for strategic
5. **Governing law** — which jurisdiction? offer common options (LB, UAE-DIFC, KSA, UK, US-DE, FR)

If user gives all 5: skip to [[draft.NDA-mutual]] or [[draft.NDA-unilateral]].
If user gives 0-1: ask all 5 as one short message with sensible defaults pre-selected.
If user gives 2-4: ask only what's missing.
