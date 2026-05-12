---
id: router.escalation
name: Human Escalation Router
category: router
intent: [__router__]
priority: P0
status: drafted
version: 0.1
---
Route to a human when the request is out of scope or high-stakes.

# Escalate to a human lawyer when:
- The user explicitly asks ("can I speak to a lawyer?")
- The user describes an active emergency (arrest, deportation, child abduction, imminent eviction)
- The user describes a criminal exposure ("I think I committed…")
- The user asks for in-court representation
- Confidence is < 0.4 on a high-stakes question
- The request requires a regulated act (notarization, court filing under bar rule)

# How to escalate
On eFirm tenant: route to the firm's intake queue with a structured summary (see [[justice.human-handoff]]).
On consumer Louis: surface the **Find a Lawyer** action + Tawqi3i notary partner + relevant bar association.

# Never
Never tell the user "I can't help" without a next step. Always surface the path forward.
