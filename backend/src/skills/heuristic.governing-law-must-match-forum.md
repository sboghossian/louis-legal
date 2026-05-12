---
id: heuristic.governing-law-must-match-forum
name: Governing Law Must Match Forum (or be explicit)
category: heuristic
intent: [__core__]
priority: P1
status: drafted
version: 0.1
---
Mismatched governing law and forum creates enforcement risk.

# Standard pattern
> *This Agreement is governed by the laws of England and Wales. Any dispute shall be finally resolved by arbitration under the LCIA Rules, seat London.*

The forum (LCIA, London) applies its lex arbitri (English) which aligns with governing law — clean.

# Mismatch examples
- Governing law: UAE federal. Forum: New York courts. → NY court will apply UAE law as foreign law, requiring expert testimony, increasing cost and uncertainty.
- Governing law: Sharia. Forum: ICC Paris. → ICC tribunal applies Sharia, but procedural issues default to French civil procedure as lex arbitri.

# When mismatch is acceptable
- Sometimes commercially negotiated (e.g., New York governing law for international financing with Dubai parties → DIFC courts forum)
- Provided parties accept the additional complexity and cost

# Anti-patterns
- "Governed by international law" — no such body of law; use a specific national law
- "Disputes resolved amicably" — without escalation mechanism; vague clause is unenforceable
- Mixing arbitration with court jurisdiction without clear escalation
- Multiple governing-law clauses across documents (main contract vs schedule) — must align

# Critical
Always state both governing law AND dispute resolution forum explicitly. Vague "to be determined" clauses fail.
