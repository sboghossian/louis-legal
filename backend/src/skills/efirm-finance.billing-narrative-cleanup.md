---
id: efirm-finance.billing-narrative-cleanup
name: 'billing narrative cleanup'
category: efirm-finance
intent: [billing, narrative]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Billing narrative cleanup.

Reviews time-entry narratives for:
- Detail level matching client guidelines (block-billing flagged)
- Privilege protection (no work-product reveal)
- Activity description clear (not "review file" — "review of M&A due diligence findings for IP issues")
- Proper grammar / spelling
- Initial / attorney tag included
- Allergy: any mention of opposing counsel by name (some clients prefer redacted)
- Length within firm style

Output: cleaned narrative + diff showing changes. Pair with [[efirm-finance.invoice-generator-from-time-entries]].
