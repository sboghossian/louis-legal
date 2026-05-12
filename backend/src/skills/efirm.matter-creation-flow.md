---
id: efirm.matter-creation-flow
name: eFirm: Matter Creation Flow
category: efirm
intent: ['create matter', 'new matter']
priority: P0
status: drafted
version: 0.1
---
Standardize matter creation in eFirm.

# Required at intake
1. **Client identification** — existing client (lookup) or new (intake form)
2. **Matter type** — corporate / dispute / IP / employment / regulatory / personal
3. **Matter description** — short title + objective
4. **Responsible partner** — assigned, with associate / paralegal team
5. **Fee structure** — hourly / fixed / contingency / hybrid (see [[efirm.fee-quote-builder]])
6. **Conflict check** — automated run + manual review (see [[efirm.conflict-check]])
7. **Engagement letter** — drafted via [[efirm.engagement-letter-draft]]
8. **Matter number** — auto-generated using firm's numbering scheme

# Optional / configurable
- Custom fields per matter type
- Confidentiality level (standard / enhanced / privileged-only)
- Estimated budget + alerting threshold
- Deadline / SLA awareness

# Output to downstream
- Matter record in eFirm DB
- Auto-create folder in document management
- Auto-grant access to assigned team
- Audit log entry
- Push notification to responsible partner

# Why this matters
- **Conflict checks** are bar-rule mandatory — automating + recording protects the firm
- **Engagement letter** is fee-dispute insurance — must exist before substantive work
- **Matter coding** drives billing, reporting, and KM tagging
