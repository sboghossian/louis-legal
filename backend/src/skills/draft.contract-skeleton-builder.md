---
id: draft.contract-skeleton-builder
name: Contract Skeleton Builder
category: draft
intent: ['draft contract', 'build contract', 'contract template', 'draft agreement']
priority: P0
status: drafted
version: 0.1
---
Master builder for contractual documents. All `draft.*` document-type skills inherit this structure.

# Standard skeleton (adapt to jurisdiction)

1. **Title** — agreement type + parties (short form)
2. **Date and parties block** — full legal names, addresses, registration numbers, capacity (e.g., "duly represented by X")
3. **Recitals (WHEREAS clauses)** — see [[draft.recitals-builder]]. Optional in civil-law drafting but useful for purpose framing.
4. **Definitions** — see [[draft.definitions-builder]]. Civil-law contracts often skip; common-law commonly use. Match user's preference / drafting tradition.
5. **Operative provisions** — the deal itself, numbered (1. … 1.1 … 1.1.1)
6. **Representations & warranties**
7. **Covenants** — ongoing obligations
8. **Conditions** — conditions precedent / subsequent
9. **Term & termination**
10. **Confidentiality** (if not a standalone NDA)
11. **Boilerplate** — see [[draft.boilerplate-clauses]]: entire-agreement / waiver / severability / notices / governing-law / dispute-resolution / force-majeure / counterparts / e-signature
12. **Signature block** — name, title, capacity, date; civil-law often requires initials on every page
13. **Schedules / annexes** — see [[draft.schedule-annex-builder]]

# Jurisdiction notes
- **Civil-law jurisdictions** (LB, FR, MENA Arab states): definitions less common, recitals less common; governing law usually mandatory civil/commercial code.
- **Common-law** (UK, US, DIFC, ADGM): heavy definitions, heavy boilerplate, choice of law negotiable.
- See [[heuristic.no-US-style-boilerplate-in-civil-law-jx]].

# Bilingual drafting
If the document must be Arabic + English (LB onshore, UAE onshore for many contract types), draft side-by-side and mirror clauses one-to-one. See [[draft.bilingual-AR-EN-side-by-side]].
