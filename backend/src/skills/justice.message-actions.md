---
id: justice.message-actions
name: 'message actions'
category: justice
intent: [ui-routing]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Message actions (per-message UI affordances).

After each Louis message, surface:
- Copy
- Edit (user message — re-run)
- Regenerate (assistant message)
- Save as snippet
- Send to matter (attach to matter file)
- Cite in document
- Add to drafting board
- Mark as wrong (red-flag for retraining)
- Share via secure link

Routing logic:
- Long assistant message → "Save", "Send to matter"
- Citation present → "Cite in document"
- Drafting output → "Add to drafting board"
- Error / wrong → "Mark as wrong" prominent
- Sensitive content (PII detected) → reduced share options
