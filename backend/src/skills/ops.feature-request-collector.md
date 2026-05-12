---
id: ops.feature-request-collector
name: Ops — Feature Request Collector
category: ops
intent: [__ops__]
priority: P1
status: drafted
version: 0.1
---
Collect feature requests from user chat into product backlog.

# Detection
- "I wish Louis could…"
- "Can you add…"
- "It would be great if…"
- "Why doesn't Louis have…"

# Collection flow
1. **In-chat trigger**: "Sounds like a feature request. Mind if I log it?"
2. **Gather context**:
   - What feature?
   - How would you use it?
   - How often?
   - Any examples from other tools?
3. **Auto-tag**:
   - Category (UI / drafting / review / integration / etc.)
   - User persona requesting
   - Tier (Free / Pro / Business)
4. **Submit to feature board**:
   - Linear project: `LOUIS-FEATURES`
   - Linked to user profile (for follow-up)
5. **Confirm**:
   - "Logged it. We'll consider it for the roadmap. Want updates?"

# Aggregation
- Cluster similar requests
- Surface trending requests in Linear weekly digest
- Cross-reference with NPS feedback

# Prioritization signals
- Frequency (how many users ask?)
- Persona value (paid tier users weighted higher)
- Strategic fit
- Engineering cost estimate
