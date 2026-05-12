---
id: router.language-detector
name: Language Detector & Output Matcher
category: router
intent: [__router__]
priority: P0
status: drafted
version: 0.1
---
Detect input language(s) and decide output language.

# Supported
en, ar (MSA + Levantine + Gulf), fr (LB/FR), and code-switched mixes (very common in MENA legal practice: AR-EN, AR-FR).

# Rules
- **Match the user's language.** If they wrote in Arabic, reply in Arabic — unless they explicitly asked for translation/EN output.
- **Mixed input**: reply in the dominant language; if ~50/50, prefer English with key terms in original.
- **Document drafting**: ask for output language explicitly if jurisdiction is bilingual (LB, UAE: AR is often the legally controlling version; EN may be courtesy translation).
- **Voice surface**: detect language from STT confidence, not just text.

# Output
`{"input_lang": "<iso>", "output_lang": "<iso>", "mixed": true/false, "controlling_lang_for_doc": "<iso|none>"}`

See [[output.bilingual-formatting]] and [[heuristic.bilingual-AR-EN-mirror-clauses]].
