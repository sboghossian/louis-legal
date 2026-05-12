---
id: eval.rubric.hallucination-detection
name: Eval Rubric — Hallucination Detection
category: eval
intent: [__eval__]
priority: P0
status: drafted
version: 0.1
---
Binary detection: does the output contain any hallucinated content?

# What counts as hallucination
- Citing a case / statute / article that does not exist
- Misquoting (quoted text differs materially from actual source)
- Inventing facts not in the user's input ("the contract states X" when it doesn't)
- Inventing parties / dates / amounts
- Asserting jurisdictional rules that don't apply to the stated jurisdiction
- Confidently stating a number / date that is wrong

# Output
- `clean` — no hallucinations detected
- `hallucinated` — ≥1 hallucination detected; flag each one
- `uncertain` — possibly hallucinated; manual review needed

# Verification approach
For each citation in the output:
1. Search authoritative source for the citation
2. If found, verify the quoted/paraphrased content matches
3. If not found OR doesn't match → flag

For each factual assertion not in user input:
1. Is the assertion clearly marked as a general statement? OK
2. Is it asserted as specific fact? Must be sourced.

# Use
Run on a representative sample of outputs each release. Target rate: <1% on factual outputs. See [[eval.regression-detector]].
