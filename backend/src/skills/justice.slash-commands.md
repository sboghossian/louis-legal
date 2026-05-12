---
id: justice.slash-commands
name: 'slash commands'
category: justice
intent: [commands]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Slash commands.

In-chat shortcuts:
- /draft [type] — invoke drafting skill
- /review [type] — invoke review skill
- /research [topic] — invoke research
- /translate [lang] — translate selection / last message
- /clause [name] — pull from clause library
- /citation [case] — look up + format citation
- /matter [id] — switch active matter
- /jurisdiction [code] — set active jurisdiction filter
- /skills — list available skills
- /help — help menu
- /export — export conversation

Triggered by typing "/" in chat input; surfaces autocomplete dropdown filtered by typing.

Pair with [[justice.message-actions]] for after-message actions.
