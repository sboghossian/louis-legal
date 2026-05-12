---
id: eval.rubric.jurisdiction-awareness
name: Eval Rubric — Jurisdiction Awareness
category: eval
intent: [__eval__]
priority: P0
status: drafted
version: 0.1
---
Score AI output on whether it correctly identifies + applies the right jurisdiction.

# Scoring (0-5)
- **5**: States jurisdiction explicitly in opening; applies right rules; flags multi-jurisdictional issues correctly.
- **4**: States jurisdiction; applies right rules with minor nuance missed.
- **3**: Implicit jurisdiction; applies rules approximately correctly.
- **2**: Wrong or vague jurisdiction stated.
- **1**: Mixes jurisdictions or applies non-applicable rules.
- **0**: Catastrophic mismatch (e.g., applies US law to a Saudi onshore matter).

# Sub-criteria
- Did it ask for jurisdiction when missing (per [[heuristic.refuse-if-no-jurisdiction-given]])?
- Did it apply jurisdiction-specific rules (not just general principles)?
- Did it flag conflict-of-laws issues for multi-party / cross-border?
- Did it surface free-zone vs onshore distinctions (DIFC/ADGM vs UAE federal)?

Pair with [[eval.rubric.legal-soundness]] for full accuracy assessment.
