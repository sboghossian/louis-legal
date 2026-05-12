---
id: efirm.client-update-email-draft
name: 'client update email draft'
category: efirm
intent: [email, client-communication]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Client update email drafter.

For each matter, drafts periodic client-update email:
- Status summary (what's happened since last update)
- Next steps + timeline
- Decisions needed from client
- Costs to date + projected
- Risks / opportunities

Tone:
- Senior partner = strategic + confident
- Mid-level lawyer = detailed + collaborative
- Junior = informative + deferential

Adapts to:
- Matter type (litigation = guarded; transaction = collaborative)
- Client preference (terse vs detailed)
- Region (MENA = formal openings; US = direct)

Output: draft email + suggested send time + reminder if no response.
