---
id: eval.rubric.legal-soundness
name: Eval Rubric — Legal Soundness (0-5)
category: eval
intent: [__eval__]
priority: P0
status: drafted
version: 0.1
---
Score AI legal output on **legal soundness** — does the answer correctly state the law and apply it correctly?

# Scoring (0-5)
- **5 — Excellent**: All legal propositions correct; citations accurate; application reasoning sound; counter-arguments addressed where relevant.
- **4 — Good**: Legal propositions mostly correct; minor citation inaccuracy or one missed nuance.
- **3 — Acceptable**: Substantial correct content with at least one moderate error in law, citation, or application.
- **2 — Poor**: Significant legal errors or missing applicable rule; would mislead a reader.
- **1 — Very poor**: Multiple serious errors; foundational rule wrong.
- **0 — Wrong / harmful**: Materially incorrect to the point of being dangerous to act on.

# Sub-criteria
- **Rule statement** — is the cited rule the right one? articulated correctly?
- **Application** — does the analysis fit the facts? are key counter-considerations addressed?
- **Citations** — real authorities? pin-cited? not fabricated?
- **Jurisdiction fit** — does the answer cover the right jurisdiction for the user's matter?
- **Currency** — is the law as stated current as of the response date?

# Use
Run on a labeled dataset (e.g., [[eval.dataset.NDA-prompts-30]]) and aggregate. Used in [[eval.LLM-as-judge-system-prompt]] for automated scoring.
