---
id: review.translation-quality-AR-EN
name: 'translation quality AR EN'
category: review
intent: [review, translation, arabic]
jurisdictions: [MENA]
priority: P1
status: drafted
version: 0.2
---

Skill: Review — Arabic ↔ English translation quality.

Evaluate translation for legal-fidelity:
- Terminology consistency (e.g., "shall" → "يجب أن" not "سوف")
- Defined terms preserved (capitalization in EN; underline + brackets in AR)
- Numerical / currency / date conversions correct
- Hijri ↔ Gregorian dates handled
- Party names in both scripts
- Boilerplate matching jurisdiction's standard (KSA Saudi-Arabic vs Egyptian-Arabic vs Levantine)
- Legal-doctrine terms preserved (e.g., "force majeure" → "القوة القاهرة" not literal)
- Sharia / fiqh terms (riba, gharar, maysir) preserved with definition footnote
- Bilingual contract: which language prevails — clause says so?
- LTR/RTL formatting preserved

Output: { errors: [{ ar, en, issue, suggestion }], inconsistencies: [...], styleNotes: [...] }
