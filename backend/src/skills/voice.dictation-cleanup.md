---
id: voice.dictation-cleanup
name: Voice — Dictation Cleanup
category: voice
intent: ['dictation cleanup']
priority: P1
status: drafted
version: 0.1
---
Clean up raw STT-transcribed dictation into formal written text.

# Common cleanup needs
1. Remove fillers: um, uh, like, you know, I mean
2. Fix STT errors (homophone confusion, common misrecognitions)
3. Punctuate (STT often produces run-on sentences)
4. Capitalize proper nouns + sentence starts
5. Standardize numbers + dates ("twenty-twenty-four" → "2024")
6. Detect + label paragraph breaks
7. Detect + correctly format defined terms

# Preserve
- Speaker's substantive meaning + structure
- Specific terminology (legal terms of art)
- Numeric details exactly

# Don't add
- New facts
- Citations the speaker didn't say
- Conclusions the speaker didn't draw

# Output
Clean prose + optional change-tracked version showing what was cleaned.

# Use case
Lawyer dictates a memo on phone while driving → Louis cleans → lawyer reviews and signs.
