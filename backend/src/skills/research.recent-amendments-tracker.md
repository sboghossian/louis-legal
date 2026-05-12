---
id: research.recent-amendments-tracker
name: Recent Amendments Tracker
category: research
intent: ['recent amendments', 'recent ruling', 'law update']
priority: P0
status: drafted
version: 0.1
---
Find recent amendments to statutes/regulations or recent court rulings.

# When to invoke
- User asks about "recent changes to X"
- User asks "is this still good law?"
- User has a long-standing answer that may have been superseded

# Sources by jurisdiction
- **LB Official Gazette** (Al-Jarida Al-Rasmiya) — published amendments
- **KSA Umm Al-Qura** (الجريدة الرسمية) — official gazette
- **UAE Federal Gazette** + emirate gazettes — for federal and emirate-level
- **DIFC Laws portal** — DIFC-specific
- **ADGM Legislation portal**
- **EU Official Journal** + EUR-Lex
- **FR Légifrance** with date filter
- **UK legislation.gov.uk**

# Look for
- Direct amendments / repeals
- Cabinet decisions / implementing regulations
- Regulator guidance (often more current than statute)
- Cases interpreting recent law
- Pending bills (signaled vs enacted)

# Output
- Statute / regulation name + current version date
- Last amendment: date + summary
- Notable interpretations / rulings (with caveats)
- Pending changes (with status)
- Confidence: high if from official gazette; lower if from press

# Run alongside
[[research.statute-lookup]] for full text; [[research.case-law-search]] for application.
