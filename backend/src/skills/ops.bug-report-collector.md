---
id: ops.bug-report-collector
name: Ops — Bug Report Collector
category: ops
intent: [__ops__]
priority: P0
status: drafted
version: 0.1
---
Auto-collect bug reports from user chat into Linear issues.

# Detection
- User says: "this isn't working", "bug", "broken", "error", "weird"
- Error event in conversation (model failure, tool error)
- User reports unexpected behavior

# Collection flow
1. **In-chat trigger**: "It looks like something's not working. Want me to create a bug report?"
2. **Gather context**:
   - What were you trying to do?
   - What happened instead?
   - What did you expect?
   - Screenshot / paste error message
3. **Auto-collect**:
   - User ID, session ID, browser/device
   - Last 5 messages in the conversation
   - Skills router decisions for affected turn
   - Server-side error logs (if accessible)
4. **Submit to Linear**:
   - Auto-create issue in `LOUIS-BUGS` project
   - Tag: severity (auto-detected: P0/P1/P2)
   - Tag: persona (lawyer vs consumer)
   - Tag: surface (web/mobile/word-plugin)
5. **Confirm to user**:
   - "Created Linear issue LOUIS-1234. The team will look at it."
   - Optionally: subscribe user to updates

# Critical
- **PII redaction** before submission to Linear
- **Tenant isolation** — never mix bug reports across tenants
- **Don't fabricate** — capture user's actual words

# Privacy
- Audit logs of what's captured
- User control over what's submitted
- Opt-out per session

See [[ops.feature-request-collector]] for the feature-request variant.
