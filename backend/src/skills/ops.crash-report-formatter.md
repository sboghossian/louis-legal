---
id: ops.crash-report-formatter
name: 'crash report formatter'
category: ops
intent: [crash, ops]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Crash report formatter.

When a client crash occurs (browser console error, mobile crash, backend 500):
- Stack trace cleanup
- Source-map decoding
- Browser / OS / device info
- User actions leading to crash (last 5 events)
- Tenant ID
- Matter ID (if in matter context)
- Severity classification

Output: structured incident ticket + suggested owner (frontend / backend / infra).

Routes to Linear (DES-incident) + Slack #louis-incidents.
