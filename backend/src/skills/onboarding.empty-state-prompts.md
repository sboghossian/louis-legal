---
id: onboarding.empty-state-prompts
name: Onboarding — Empty-State Prompts
category: onboarding
intent: [__onboarding__]
priority: P0
status: drafted
version: 0.1
---
Suggest prompts in empty-state screens — no chats yet, no documents yet, etc.

# Empty states + appropriate prompts

## /home (no recent chats)
"Let's start by drafting an NDA, reviewing a contract, or researching a topic."

## /assistant (new chat)
First-prompt-by-persona ([[onboarding.first-prompt-suggestion-by-persona]])

## /projects (no projects)
"Create a project to organize documents and chats by matter."

## /doc-workspace (no docs)
"Upload a contract via Projects → New Document, or use the Acme MSA demo."

## /drafting-board (empty board)
"Start a new matter and Louis will lay out an agentic workflow."

## /skills (no recent decisions)
"Try the route-tester to see how Louis picks skills for any message."

# Pattern
- Friendly + actionable
- Clear next step
- Skip pure "no data" messaging — always give the user something to click

# Personalization
- Persona-aware prompts ([[onboarding.persona-detection-questions]])
- Time-of-day-aware (morning: "start your day with…", afternoon: "wrap up by…")
- Recency-aware (after returning user comes back: "Welcome back. Continue with [last matter]?")
