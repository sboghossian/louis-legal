---
id: site.use-case-router
name: Site — Use Case Router
category: site
intent: [__site__]
priority: P1
status: drafted
version: 0.1
---
Route to `/use-cases/:slug` based on user's job-to-be-done.

# Common use-case pages
- `/use-cases/contract-drafting`
- `/use-cases/contract-review`
- `/use-cases/legal-research`
- `/use-cases/m-and-a-due-diligence`
- `/use-cases/employment-law`
- `/use-cases/litigation-prep`
- `/use-cases/regulatory-compliance`
- `/use-cases/startup-incorporation`
- `/use-cases/data-privacy`

# Routing logic
- Detect intent + practice area from user message
- Match to corresponding use-case page
- Deep-link from chat to relevant marketing page

# Use within Louis
- Onboarding: "What brings you here today?" → use-case page
- After successful task: "Want to learn more about [related use case]?"
- Sales-intent conversations: surface relevant use-case page

# Critical
- Pages should show real product capabilities for that use case
- Include case studies + ROI metrics where available
- Don't promise features not yet built
