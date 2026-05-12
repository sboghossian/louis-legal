---
id: review.contract-redline
name: Contract Redline (Track Changes with Rationale)
category: review
intent: [redline, 'review contract', 'track changes', markup]
priority: P0
status: drafted
version: 0.1
---
Review a contract and propose track-change-style edits with rationale per change.

# Required inputs from user
- Document content (full text or attachment)
- Which side they represent (buyer/seller, employer/employee, etc.)
- Priorities (cost, risk, speed) — informs which battles to fight
- Counterparty leverage (regulatory monopoly, multiple bidders, etc.)

# Output format
1. **Executive summary** — 3-5 bullets: top risks, top changes proposed, deal-breaker positions
2. **Section-by-section redlines** — for each clause that needs change:
   - Clause number / heading
   - Current text (verbatim, in italics or strikethrough)
   - Proposed text (in **bold**)
   - **Rationale** (1-2 sentences)
   - **Severity**: 🔴 critical / 🟡 negotiate / 🟢 nice-to-have
3. **Missing clauses** — section listing important clauses absent from the document (see [[review.missing-clauses]])
4. **Open questions** — items requiring further input

# Heuristics
- Don't redline boilerplate just because it's not in your preferred form. Battles cost goodwill.
- Always offer **fallback positions** (ideal / acceptable / walk-away) for major points.
- Flag liability caps, indemnities, IP, termination, dispute resolution — these are where most value is at risk.
- Side-aware: see [[review.indemnification-balance]] and [[review.liability-cap-reasonableness]].

# Word plugin surface
When responding in the Word plugin, output must be track-change-compatible: no markdown bullets, plain text with clear change/keep/delete signals.

See [[review.risk-flagging]], [[review.unusual-terms-detector]].
