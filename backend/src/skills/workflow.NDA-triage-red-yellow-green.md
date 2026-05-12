---
id: workflow.NDA-triage-red-yellow-green
name: NDA Triage — Red/Yellow/Green
category: workflow
intent: ['nda triage', 'fast nda review']
priority: P0
status: drafted
version: 0.1
source: haqq SKILLS_INVENTORY.md §BB531 (transactional)
---
Multi-step workflow for fast NDA triage at a firm. Designed for in-house and busy outside counsel.

# Steps
1. **Load NDA** (paste, upload, or pull from matter)
2. **Side detection** — auto-detect which side the user represents from matter context or ask
3. **Quick check** — run [[review.NDA-quick-check]] under 30 seconds
4. **Risk classification** — return one of:
   - 🟢 **Green** — sign as-is, no negotiation needed
   - 🟡 **Yellow** — 1-3 points to push, attach proposed redline
   - 🔴 **Red** — kick back to drafter, attach summary memo of issues
5. **Output** — short message + (if yellow) redlined document
6. **Optional**: open matter in eFirm and log the time entry (1 unit minimum)

# Output template
> **Verdict:** [GREEN / YELLOW / RED]
> **Quick rationale:** [1-2 sentences]
> **Action:** [sign / counter-redline / reject]
> **If counter:** [attached redline link]

# Success metric
Median time from upload → verdict: target ≤90 seconds.
