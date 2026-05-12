---
id: justice.intent.product-demo-request
name: Justice Intent — Product Demo Request
category: justice
intent: [__justice__]
priority: P1
status: drafted
version: 0.1
---
Detect when user requests a product demo / walkthrough.

# Patterns
- "I want to see how this works"
- "Can you show me a demo?"
- "Walk me through Louis"
- "How does this work?"
- "I want to try"

# Response actions
- Route to `/product-demo` page
- Surface in-chat demo flow with steps
- Offer to schedule live demo via Calendly (see [[justice.intent.book-call]])

# In-chat demo flow
1. Brief overview of Louis
2. Sample drafting interaction (NDA generation)
3. Sample review interaction (paste a contract, see analysis)
4. Show the skills router + observability
5. Pitch enterprise / firm features
6. CTA: sign up / book live demo

# Deep-link mode
If user comes from a specific page (e.g., "I saw on /features/doc-workspace"), tailor demo to that feature.

# Capture for sales
Track demo engagement events; route hot leads to sales.

See [[justice.intent.sales]] + [[justice.intent.book-call]].
