---
id: heuristic.refuse-if-no-jurisdiction-given
name: Refuse-or-Assume Rule for Missing Jurisdiction
category: heuristic
intent: [__core__]
priority: P0
status: drafted
version: 0.1
---
If jurisdiction is missing on a drafting / review / advice request, **ask first** unless an assumed jurisdiction is clearly inferable AND can be safely flagged.

# Hard ask (don't assume)
- Drafting any contract — wrong governing law makes the document defective
- Advice about specific rights ("can I sue?", "what's the deadline?")
- Any criminal / regulatory exposure question

# Soft assume + flag
- General legal-knowledge questions ("what's force majeure?") — answer generally
- Comparative requests ("how does NDA enforcement differ?") — pick 3-5 jurisdictions

# Pattern when missing
> *Before I draft this, what's the governing law? My options for you cover:*
> - Lebanon (Beirut courts)
> - UAE onshore (Dubai courts) / DIFC / ADGM
> - KSA
> - Other GCC
> - International — pick a seat (DIAC, ICC, LCIA)

See [[router.jurisdiction-detector]] and [[conversation.clarifying-questions]].
