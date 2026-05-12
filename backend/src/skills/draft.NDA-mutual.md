---
id: draft.NDA-mutual
name: Mutual NDA
category: draft
practice_area: corporate
intent: [nda, 'mutual nda', 'confidentiality agreement', non-disclosure]
required_inputs: [parties, jurisdiction, purpose, term]
priority: P0
status: drafted
version: 0.1
related: [draft.NDA-unilateral, review.NDA-quick-check, conversation.intake-NDA]
---
Draft a mutual NDA between two parties exploring a transaction or collaboration.

# Required inputs (ask via [[conversation.intake-NDA]] before drafting)
1. **Party A** name + entity type + address
2. **Party B** name + entity type + address
3. **Purpose** — e.g., "evaluating a potential acquisition", "discussions regarding a commercial partnership"
4. **Term of confidentiality obligation** — default 2 years from disclosure; user may set 3-5 for strategic deals
5. **Governing law** — country / free zone

# Optional inputs
- Surviving obligations (default: continue past term for trade secrets)
- Carve-outs (default: independently developed, already public, lawful third-party receipt, court order)
- Permitted recipients (default: directors, officers, employees, professional advisors on a need-to-know basis)
- Return / destruction of materials on request

# Structure
1. Parties + recitals
2. Definitions (Confidential Information; Affiliates; Representatives; Permitted Purpose)
3. Confidentiality obligations (each Party as both Discloser and Recipient — symmetric)
4. Permitted disclosures + court-order proviso
5. Term + survival
6. No license / no IP transfer
7. No representation as to accuracy (Confidential Information is provided "as is")
8. Remedies — injunctive relief in addition to damages
9. Governing law + dispute resolution
10. Boilerplate (see [[draft.boilerplate-clauses]])

# Jurisdictional notes
- **LB**: default to Beirut courts unless parties agree to arbitration. Consider Tawqi3i for execution.
- **KSA**: avoid US-style penalty clauses; structure liquidated damages as honest pre-estimates of loss.
- **UAE-onshore**: enforceability of liquidated damages is courts-discretion (CC Art 390); DIFC/ADGM enforce per common-law contractual principles.
- **DIFC / ADGM**: full common-law NDA conventions apply.

# Output
Produce a complete, ready-to-execute document. **Avoid `[INSERT X]` placeholders** unless the user asked for a fill-in template. If a value wasn't given, use a clearly-labeled default and call it out at the top: *"Defaults used: term = 2 years; carve-outs = standard 4."*
