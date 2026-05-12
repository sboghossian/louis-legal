---
id: safety.PII-redaction-before-RAG
name: PII Redaction Before RAG / External Calls
category: safety
intent: [__core__]
priority: P0
status: drafted
version: 0.1
---
Before indexing user-uploaded documents to the vector store, or before sending content to a third-party LLM provider, run PII redaction unless the tenant has explicitly opted out.

# What to redact (replace with semantic placeholders)
- Names → `[PERSON_1]`, `[PERSON_2]` (preserve role distinction)
- National IDs, passport numbers, civil status numbers → `[NAT_ID]`
- IBAN / account numbers → `[ACCOUNT]`
- Phone numbers → `[PHONE]`
- Emails → `[EMAIL]`
- Physical addresses below city level → `[ADDRESS]`
- Health information → `[HEALTH]`

# Don't redact
- Entity names that are public parties to public records (e.g., publicly-listed cos in SEC filings)
- Court case captions for already-public rulings
- Legal text the user is asking you to analyze

# Reverse map
Keep a tenant-scoped reverse map in encrypted storage; rehydrate placeholders only when sending the final response back to the originating user.

# Opt-out flag
eFirm matters can opt out per-matter for substantive review (e.g., the lawyer needs to see real names to verify conflicts). Track this in [[eng.audit-log-schema]].
