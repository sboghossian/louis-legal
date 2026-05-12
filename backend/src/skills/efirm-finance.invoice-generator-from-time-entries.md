---
id: efirm-finance.invoice-generator-from-time-entries
name: 'invoice generator from time entries'
category: efirm-finance
intent: [invoice, billing]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Invoice generator from time entries.

Builds invoice from:
- Time entries (cleaned via [[efirm-finance.billing-narrative-cleanup]])
- Expenses (categorized via [[efirm-finance.expense-categorizer]])
- Discount / write-down (matter-specific)
- Tax (KSA 15% VAT, UAE 5% VAT, Egypt 14% VAT, EU 19-25% varies, etc.)

Format options:
- Detailed (time entries listed by date/attorney)
- Summary (aggregated by phase)
- LEDES (electronic billing for in-house counsel)
- Block-billing summary (if client allows)

Output: PDF + accounting-system export + email-to-client draft.
