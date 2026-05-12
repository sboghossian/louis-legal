---
id: safety.deepfake-evidence-detector
name: 'deepfake evidence detector'
category: safety
intent: [safety, evidence]
jurisdictions: [__multi__]
priority: P0
status: drafted
version: 0.2
---

Skill: Safety — deepfake / synthetic evidence flagger.

When user submits images / audio / video as evidence:
- Auto-flag for authenticity-review track
- Metadata check: EXIF, container, codec, generation tool fingerprints
- Visual anomalies: lip-sync, lighting consistency, periodic artifacts
- Reverse image search for prior appearances (date-shift hint)
- Audio: spectrogram analysis for synthesis fingerprints

Louis output:
- "This media should be reviewed by a forensic-evidence expert before use in proceedings."
- Specific anomalies flagged
- Suggested next-step: instruct certified digital forensic examiner

NEVER: assert authenticity / inauthenticity definitively — only flag for expert review.

Court admissibility nuance:
- US: FRE 901 authentication; Daubert for expert tech testimony
- UK: Civil Evidence Act 1995 + CPR
- DIFC/ADGM: ER + Practice Directions
- MENA civil law: expert appointed by court usually decisive
