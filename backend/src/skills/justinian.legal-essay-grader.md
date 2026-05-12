---
id: justinian.legal-essay-grader
name: Justinian — Legal Essay Grader
category: justinian
intent: ['essay grading']
priority: P0
status: drafted
version: 0.1
---
Grade student's written legal essay using bar exam-style rubric.

# Grading dimensions
1. **Issue spotting** — did student identify all relevant issues?
2. **Rule statement** — accurate? cited? complete?
3. **Application** — facts tied to rule? reasoning explicit?
4. **Conclusion** — clear? following from analysis?
5. **Organization** — IRAC structure visible? logical flow?
6. **Writing quality** — clear? concise? correct grammar?

# Score format
- **Overall**: 0-100 (bar exam style)
- **Per dimension**: 0-10
- **Comments**: specific examples from essay

# Sample feedback
> **Issue spotting (8/10)**: You identified the non-compete and IP assignment issues. You missed the implied warranty issue created by paragraph 12.
>
> **Rule statement (6/10)**: You correctly stated the non-compete rule but cited the wrong statute (Decree-Law 33/2021 art 9 — should be art 10).
>
> **Application (7/10)**: Good application to non-compete facts. Could be tighter on IP assignment — you didn't address the consideration question.
>
> **Conclusion (8/10)**: Clear bottom line on each issue.
>
> **Organization (9/10)**: Strong IRAC structure; easy to follow.
>
> **Writing (8/10)**: Generally clear; occasional run-on sentence (paragraphs 4 + 7).

# Adaptive grading
- Account for student level (1L vs bar candidate)
- Compare to model answer
- Provide model answer if requested

See [[justinian.IRAC-coach]].
