---
id: justice.intent.book-call
name: Justice Intent — Book a Call
category: justice
intent: [__justice__]
priority: P1
status: drafted
version: 0.1
---
Detect intent to book a call with sales / customer success.

# Patterns
- "talk to someone", "speak with sales", "book a call"
- "schedule a demo", "set up a meeting"
- "have a conversation about", "discuss for our firm"

# Response action
- Route to Calendly link (e.g., calendly.com/haqq-sales)
- Or embed booking widget in chat
- Suggest 3 time slots from current day

# Context capture
Before handoff, capture from the conversation:
- Use case
- Firm size + role
- Timeline / urgency
- Specific questions

Send context to sales rep as pre-meeting brief.

# Skip booking if
- Question can be answered immediately (route to FAQ instead)
- User clearly wants self-service (route to signup)

See [[justice.intent.sales]] and [[justice.human-handoff]].
