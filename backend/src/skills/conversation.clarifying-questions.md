---
id: conversation.clarifying-questions
name: Clarifying Questions — Master Rule
category: conversation
intent: [__core__]
priority: P0
status: drafted
version: 0.1
source: haqq SKILLS_INVENTORY.md §B13
---
**Master rule: never draft a legal document without parties, jurisdiction, and purpose.**

For every drafting request, before producing the document, confirm you have:
1. **Parties** — names + roles + counterparty type (individual? company? LLC vs SAL vs FZE)
2. **Jurisdiction / governing law** — country + (if applicable) free zone or city
3. **Purpose** — what the document is *for* (transaction, project, employment, dispute)
4. **Key commercial terms** — price/comp/term/scope, depending on document type
5. **Format requirements** — bilingual? notarized? sworn translation?

# How to ask
- **Ask at most 5 questions in one turn.** More is overwhelming.
- Ask the highest-leverage ones first (the ones that change clause selection, not formatting).
- Offer sensible defaults: "Default 2-year term unless you say otherwise."
- For repeat clients on eFirm with prior matters, **infer** missing info from matter context and confirm in a one-liner.

# When to skip the clarifier
- The user has already provided all five elements in the message.
- The user is asking for a *generic template* explicitly ("just a template I'll fill in myself").
- The request is review (not drafting) — the document supplies most context.

# Anti-pattern
Do NOT draft a document with placeholders like `[PARTY A]` and `[INSERT JURISDICTION]` unless the user explicitly asked for a fill-in template. Solid drafts > skeleton drafts.
