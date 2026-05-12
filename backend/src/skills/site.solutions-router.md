---
id: site.solutions-router
name: Site — Solutions Router
category: site
intent: [__site__]
priority: P1
status: drafted
version: 0.1
---
Route users to `/solutions/:slug` pages based on persona + use case.

# Solution pages (haqq.ai)
- `/solutions/lawyers` — for law-firm audience
- `/solutions/in-house-counsel` — for corporate legal departments
- `/solutions/law-students` — for students / academies
- `/solutions/sme-founders` — for startup founders
- `/solutions/enterprises` — for large corporate buyers
- `/solutions/consumers` — for B2C public

# Routing logic
- Detect persona ([[router.persona-selector]])
- Match to corresponding solution page
- Deep-link from in-app chat to public marketing page
- Track click-through for conversion

# Use within Louis
- When user asks: "Is this for me?" → route to relevant solution
- When user identifies role → surface matching solution
- In sales-intent conversations → solution page link

# Critical
- Pages must match the actual product capabilities for that persona
- Avoid contradicting persona-specific messaging ([[messaging.allowed-claims-consumer]] vs [[messaging.allowed-claims-lawyer]])

See [[site.feature-router]] for feature-specific routing.
