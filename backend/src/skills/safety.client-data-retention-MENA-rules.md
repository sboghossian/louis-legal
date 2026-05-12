---
id: safety.client-data-retention-MENA-rules
name: 'client data retention MENA rules'
category: safety
intent: [safety, retention]
jurisdictions: [MENA]
priority: P0
status: drafted
version: 0.2
---

Skill: Safety — client data retention rules (MENA).

Bar / regulatory retention requirements:
- **KSA**: Saudi Bar Association — files for min 5 yrs post-matter; AML records 10 yrs
- **UAE**: Federal Decree-Law on Legal Profession 23/1991 — min 5 yrs post-matter; AML 5 yrs minimum (DFSA 6 yrs)
- **Lebanon**: Beirut Bar / Tripoli Bar internal rules — 10 yrs typical
- **Egypt**: 10 yrs typical
- **DIFC**: DFSA AML 6 yrs, client files per engagement letter
- **ADGM**: FSRA AML 6 yrs

After retention period:
- Anonymize then delete (vs hard-delete) — protects against later need
- Client may request hold (preserves for them; document the request)
- Tax records: 10 yrs minimum across jurisdictions

Louis: configurable retention per matter; automatic anonymization at threshold; legal-hold flag overrides auto-delete.
