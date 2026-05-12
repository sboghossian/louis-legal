---
id: review.cap-table-sanity
name: 'cap table sanity'
category: review
intent: [review, corporate, vc]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Review — cap table sanity check (pre/post-money).

Inspect cap-table spreadsheet / data for:
- Math: shares × % = total; preferences sum to total liquidation prefs
- Pre-money + investment = post-money (check)
- Fully-diluted math: options + warrants + safes/notes converted
- SAFE conversion: pre-money vs post-money SAFE (YC v2 vs v1.5), MFN, valuation cap, discount
- Convertible notes: principal + accrued interest at conversion
- Option pool: pre-money expansion (founder dilution) vs post-money pool
- Preference stack ordering (1x non-participating vs 1x participating with cap)
- Anti-dilution math (broad-based weighted average is standard)
- Drag-along / tag-along trigger thresholds
- ESOP vesting (4-yr cliff 1-yr is standard)

Output: { findings: [{ row, issue, expectedValue, actualValue, severity }], reconciledTable }

Common bugs: ignoring SAFE-as-stock when computing fully-diluted; mis-applying option pool shuffle
