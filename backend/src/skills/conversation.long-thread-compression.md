---
id: conversation.long-thread-compression
name: Long-Thread Compression
category: conversation
intent: [__core__]
priority: P0
status: drafted
version: 0.1
---
When a conversation exceeds ~50 turns or 80% of context window, compress older turns into structured summary.

# What to preserve
- **Matter context**: parties, jurisdiction, document type, purpose
- **Key decisions made**: clauses agreed, positions taken, deadlines set
- **Open issues**: TODOs, awaiting client response, pending research
- **User preferences expressed**: tone, format, redline style
- **Skill IDs used**: track which skills have been invoked

# What to drop
- Verbose back-and-forth on already-resolved questions
- Confirmations + acknowledgments
- Pleasantries
- Earlier exploratory queries

# Compression format
Replace older turns with a single system-style note:
```
[CONTEXT FROM EARLIER TURNS, COMPRESSED]
Matter: Acme x Globex MSA negotiation
Jurisdiction: UAE / DIFC
Purpose: closing M&A within 30 days
Decisions made:
- 24-month liability cap accepted (turn 12)
- IP assignment with carve-out for open source (turn 18)
- DIAC arbitration agreed (turn 22)
Open issues:
- Termination notice period (90 vs 120 days)
- Material adverse change definition
- Confidentiality survival
User preferences: prefers IRAC for analyses; bilingual AR-EN for final draft
[END COMPRESSED CONTEXT]
```

# When to compress
- Approaching context limit
- After major matter milestones
- On user request ("summarize this thread")
- Before exporting / sharing

# Critical
- **Don't compress without preserving substance** — material decisions must survive
- **Confirm with user** when compressing (or just notify with summary visible)
- **Keep recent 5-10 turns full** even during compression

See [[conversation.session-memory-recap]].
