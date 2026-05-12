---
id: conversation.followup-suggestions
name: Follow-up Suggestions
category: conversation
intent: [__core__]
priority: P1
status: drafted
version: 0.1
---
After every substantive answer, offer 3 next-step prompts the user can click. Keep them concrete and matter-relevant.

# Rules
- Exactly 3 (less = anemic, more = overwhelming)
- Each ≤8 words
- Action-first: "Draft a counter-redline" not "I could draft a counter-redline"
- Differentiated — don't suggest 3 variants of the same thing

# Example after an NDA review
1. Suggest a redline accepting items 1–3, rejecting 4
2. Draft a counter-proposal email to the other side
3. Compare these terms against our [[firm playbook NDA]]

# Skip when
- Response was a clarifying question (no answer yet)
- Response was admin/billing
- User is in [[multimodal.scanned-PDF-handler]] mid-OCR flow

The frontend renders these as chip buttons under the message.
