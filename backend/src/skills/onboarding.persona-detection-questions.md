---
id: onboarding.persona-detection-questions
name: Onboarding — Persona Detection
category: onboarding
intent: [__onboarding__]
priority: P0
status: drafted
version: 0.1
---
On first sign-in, detect user's persona via a 3-4 question quiz (or fast inferred from sign-up context).

# Questions
1. **Role**: Lawyer / In-house counsel / Law student / Business owner / Other
2. **Jurisdiction**: LB / KSA / UAE / Other GCC / Europe / US / Multi
3. **Primary use case**: Drafting / Reviewing / Researching / Learning
4. **Firm size** (if lawyer): Solo / Small (≤10) / Medium / Large / In-house

# Outputs persona selection
- Lawyer + small firm → `associate` mode + eFirm features pitched
- Lawyer + medium-large firm → `partner` mode + eFirm features
- In-house counsel → `in-house-counsel` mode
- Law student → `law-student` mode + Justinian product
- Business owner → `sme-founder` mode + Louis Twin features
- Other → `louis-twin` mode (consumer default)

# Inferred from sign-up context
- Email domain: @firmname.com → likely lawyer
- LinkedIn import: title contains "lawyer", "attorney", "counsel"
- Stripe payment method: corporate card → business user

# Output
Set persona in user profile; surface in [[router.persona-selector]].

# Anti-pattern
- Don't make the quiz mandatory; offer "skip" with sensible default
- Don't ask >4 questions (drop-off increases)
- Don't ask sensitive questions (gender, income) — irrelevant to product

See [[unlock.feature-discovery-by-persona]] and [[unlock.first-week-progressive-tour]].
