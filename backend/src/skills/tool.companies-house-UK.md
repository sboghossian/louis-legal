---
id: tool.companies-house-UK
name: 'companies house UK'
category: tool
intent: [registry-lookup, kyc]
jurisdictions: [UK]
priority: P1
status: drafted
version: 0.2
---

Tool: UK Companies House (CH) registry lookup.

Most-comprehensive free corporate registry globally. Searches:
- Company number → full filing history (annual returns, accounts, mortgages, charges)
- Officer name → all directorships (current + historic)
- PSC (People with Significant Control) register — UBO transparency at 25% threshold
- Insolvency filings

For MENA deals: many BVI/Cayman holding structures end up with UK Sub or UK officer — CH is the easiest free entry point.

Output: { company, officers, pscs, filings, chargeRegister, accounts }

Source: https://find-and-update.company-information.service.gov.uk/
