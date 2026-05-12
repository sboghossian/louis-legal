---
id: tool.SEC-EDGAR-US
name: 'SEC EDGAR US'
category: tool
intent: [filings-lookup]
jurisdictions: [US]
priority: P1
status: drafted
version: 0.2
---

Tool: SEC EDGAR (US public company filings).

Search filings by:
- Company / CIK
- Form type (10-K annual, 10-Q quarterly, 8-K material event, S-1 IPO, DEF 14A proxy, 13D/G ownership)
- Filing date range
- Officer/director (4 + insider trades)

Use cases:
- Counterparty due diligence on US-listed parent
- Pull recent risk factors before signing supply agreement
- Track changes in beneficial ownership
- Find acquisition history / material agreements

Output: { filings: [{ form, date, url, exhibits: [...] }] }

Pair with [[connector.SEC-EDGAR]] for live MCP-style access in chat.
