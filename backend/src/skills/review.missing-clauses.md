---
id: review.missing-clauses
name: Missing-Clauses Detector
category: review
intent: ['missing clauses', 'completeness check']
priority: P0
status: drafted
version: 0.1
---
Check the document against a checklist for that document type and flag missing important clauses.

# Process
1. Identify document type (NDA, MSA, lease, etc.)
2. Load the standard skeleton for that document — see [[draft.contract-skeleton-builder]] and each specific `draft.*` skill
3. Compare clause-by-clause; flag missing items
4. Categorize: **mandatory** (e.g., governing law, signature block) / **strongly recommended** (e.g., entire agreement) / **optional**

# Output
| Missing clause | Why it matters | Severity |
|----------------|----------------|----------|
| Governing law  | Court will apply default forum rule which may not be favorable | 🔴 |
| Force majeure  | Increases risk during disruptions | 🟡 |

# Jurisdictional checklists
Some clauses are mandatory under specific local law:
- UAE: indemnity language may need careful framing under CC Art 390 (penalty clauses are judicially adjustable)
- KSA: arbitration clause must specify seat + rules + language to avoid courts assuming general SCCA default
- LB: bilateral commercial contracts ≥ LBP 1M technically need written form (Art 254 OCC)

See [[review.contract-redline]].
