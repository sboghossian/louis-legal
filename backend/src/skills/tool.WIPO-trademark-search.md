---
id: tool.WIPO-trademark-search
name: 'WIPO trademark search'
category: tool
intent: [trademark-lookup, ip]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Tool: WIPO Global Brand Database (trademark search).

Search Madrid System international trademark registrations + national feeds (US, EU, UK, FR, DE, MENA, China, Japan, etc.).

Fields:
- Mark (word, image, sound)
- Classes (Nice 1–45)
- Owner
- Status (registered, pending, opposed, refused, lapsed)
- Designation territories
- Priority date

Use cases:
- Clearance search before client launch
- Conflict check for new client mark
- Watch service for similar filings
- Monitor opponent moves

Output: { marks: [{ mark, owner, classes, status, designations, priorityDate, imageUrl }] }

Pair with [[tool.local-trademark-registers]] for unregistered / national-only marks (Saudi SAIP, UAE MoE, etc.).
