---
id: review.risk-flagging
name: Risk Flagging (per Clause)
category: review
intent: [risk, 'flag risk', 'risky clauses']
priority: P0
status: drafted
version: 0.1
---
Flag risk per clause: 🔴 critical / 🟡 medium / 🟢 low.

# 🔴 Critical (always surface, even in short reviews)
- Uncapped liability or liability cap < 1x annual fees
- Indemnity asymmetry (one side indemnifies broadly, other narrowly)
- Termination for convenience without cure period (or shockingly short — under 30 days)
- IP assignment without consideration (or without carve-out for pre-existing IP)
- Non-compete that's overly broad in scope/term/geography
- Governing law / forum that exposes user to adverse jurisdiction
- Data processing absent DPA when personal data is involved
- Auto-renewal with long opt-out window
- Most-favored-customer clauses
- Audit rights that are unbounded / one-sided
- Penalty clauses that exceed actual damages (esp. KSA: enforceability concerns)

# 🟡 Medium
- Notice periods that aren't aligned across termination clauses
- Force majeure missing pandemic / cyber / regulatory carveouts
- Insurance amounts not specified
- Survival clauses that omit relevant obligations
- Confidentiality term too short for trade secrets
- Cure periods missing for material breach

# 🟢 Low
- Style / cosmetic
- Definitions that could be tightened
- Boilerplate variations

# Output structure
Per clause: `{ clause: "<id>", severity: "🔴|🟡|🟢", issue: "<short>", rationale: "<one line>", proposed_fix: "<short>" }`

Use this skill alongside [[review.contract-redline]].
