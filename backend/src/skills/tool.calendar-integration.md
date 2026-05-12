---
id: tool.calendar-integration
name: 'calendar integration'
category: tool
intent: [calendar, scheduling]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Tool: Calendar integration (Google / Outlook / iCal).

Connect lawyer's calendar to Louis for:
- Auto-block court dates from matter management
- Suggest meeting slots based on matter urgency
- Surface upcoming statutes of limitations as calendar reminders
- Block "deep work" time for drafting

Output: { events: [{ title, start, end, location, matterId, type }] }

Combined with [[connector.calendar]] and [[tool.date-tool-deadline-calculator]] for end-to-end deadline orchestration.
