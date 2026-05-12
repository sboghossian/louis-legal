---
id: output.table-of-comparisons
name: Table of Comparisons
category: output
intent: [__format__]
priority: P0
status: drafted
version: 0.1
---
Format output as a structured comparison table for multi-jurisdictional or multi-option questions.

# Pattern
| Aspect | Option A | Option B | Option C |
|--------|----------|----------|----------|
| Statute | … | … | … |
| Max duration | … | … | … |
| Enforceability | … | … | … |
| Cost | … | … | … |
| Recommendation | … | … | … |

# Best practices
- **Same row order** for each option (apples-to-apples)
- **Same level of detail** per cell
- **Citations per cell** where the source matters
- **Summary row at bottom**: BLUF per option
- **Decision recommendation** below table

# Example
For "compare non-compete enforceability in LB / KSA / UAE":
| Aspect | LB | KSA | UAE federal | DIFC |
|--------|----|----|-------------|------|
| Statute | Labor Code | Royal Decree | Decree-Law 33/2021 | DIFC Law 4/2021 |
| Max duration | Case-by-case | 2 years | 2 years | Reasonable test |
| Compensation required | Recommended | No | No | No |
| Court approach | Narrow | Reasonable scope | Proportionate | Common-law reasonableness |
| Enforceability | Mixed | Moderate | High if proportionate | High |

# Pair with
[[research.jurisdiction-comparison]] · [[output.executive-summary-first]]
