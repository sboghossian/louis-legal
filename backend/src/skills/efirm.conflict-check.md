---
id: efirm.conflict-check
name: eFirm: Conflict Check
category: efirm
intent: ['conflict check']
priority: P0
status: drafted
version: 0.1
---
Run a conflict check before accepting a new matter.

# Inputs
- New client name (and corporate group / UBOs if available)
- Counterparties (and their group / UBOs)
- Related parties (witnesses, sub-contractors, lenders if relevant)
- Matter description (some conflicts are issue-conflicts, not just party-conflicts)

# Search dimensions
1. **Adverse parties** — has the firm represented any of them, currently or historically?
2. **Current clients** — would the new matter be adverse to a current client (positional or direct)?
3. **Former clients** — substantially related matter test (varies by bar rules)
4. **Issue conflicts** — taking a position adverse to a position previously argued for a different client (more nuanced — partner judgment)
5. **Personal interests** — lawyer personal/family relationships with parties
6. **Material limitations** — would representation be materially limited by other obligations?

# Output
- Clean → proceed
- Concern → flag for partner review with details
- Conflict → cannot proceed without consent OR cannot proceed at all

# Bar-rule sources
- ABA Model Rules 1.7-1.10 (US baseline)
- LB Bar Code of Ethics
- KSA Code of Law Practice
- UAE Law Society / Federal Law on Legal Profession
- DIFC Rules of Conduct
- ADGM Rules of Conduct

# Consent waivers
Some conflicts can be waived with informed written consent of all affected clients. The waiver itself must be carefully drafted and reviewed by the conflicts partner.

# Critical
Never proceed on substantive work without conflict-check completion — it's a malpractice + bar-discipline issue.
