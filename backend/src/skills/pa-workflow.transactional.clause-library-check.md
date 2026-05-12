---
id: pa-workflow.transactional.clause-library-check
name: Clause Library Check
category: pa-workflow
intent: [__workflow__]
priority: P1
status: drafted
version: 0.1
---
Verify document uses firm's preferred clauses + flag deviations.
# Steps
1. Parse document clauses
2. Map to firm's clause library
3. Highlight non-standard clauses
4. Suggest replacement with library version
5. Track which clauses get deviated frequently (KB feedback loop).
