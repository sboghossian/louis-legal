---
id: ops.linear-triage-from-chat-bug-report
name: Ops — Linear Triage from Chat
category: ops
intent: [__ops__]
priority: P1
status: drafted
version: 0.1
---
Auto-triage incoming bug reports + feature requests in Linear.

# Steps
1. **Receive** bug / feature from chat (see [[ops.bug-report-collector]])
2. **Categorize**:
   - Severity (auto-detected from impact description)
   - Component (frontend/backend/skill/router/auth/billing)
   - User persona (consumer/lawyer/enterprise)
3. **Assign** to team:
   - Frontend bugs → frontend lead
   - Backend / API → backend lead
   - Skill router → AI team
   - Billing → ops lead
4. **Set due date** based on severity:
   - P0: 24h
   - P1: 1 week
   - P2: 1 month
5. **Notify** via Slack to relevant channel
6. **Subscribe user** to updates if they opted in

# Severity heuristics
- **P0**: outage, data loss, security
- **P1**: feature broken for many users, payment issues, frequent crashes
- **P2**: edge case, single-user issue, minor annoyance
- **P3**: cosmetic, nice-to-have

# Anti-pattern
- Over-triage: not every bug needs full categorization
- Under-triage: P1 bugs without owner languish
- No SLA: bugs marked but not acted on
