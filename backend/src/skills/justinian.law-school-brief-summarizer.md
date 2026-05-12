---
id: justinian.law-school-brief-summarizer
name: 'law school brief summarizer'
category: justinian
intent: [education]
jurisdictions: [__multi__]
priority: P2
status: drafted
version: 0.2
---

Skill: Justinian — law-school case brief summarizer.

For any case, produces a law-school style brief:
- **Case name + citation**
- **Procedural posture** (where in court system)
- **Facts** (relevant only)
- **Issue** (1 sentence question)
- **Holding** (yes/no with key element)
- **Rule** (legal rule applied)
- **Reasoning** (court's logic)
- **Concurrences / dissents**
- **Notes** (subsequent treatment, key citing cases)

Adapts depth:
- 1L: lots of context
- 2L/3L: terse
- Bar prep: rule-focused
- Practitioner: implication-focused

Pair with [[research.precedent-finder]] and [[justinian.flashcards-from-statute]].
