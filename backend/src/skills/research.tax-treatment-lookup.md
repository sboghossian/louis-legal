---
id: research.tax-treatment-lookup
name: 'tax treatment lookup'
category: research
intent: [tax-treatment]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Skill: Tax treatment lookup (corporate, VAT, withholding, transfer pricing).

For a given transaction + jurisdiction, return:
- Corporate income tax rate + applicability
- VAT/GST rate + place-of-supply rules
- Withholding tax on outbound payments (dividends, interest, royalties, services)
- Treaty relief (DTT) if applicable
- Transfer pricing rules (BEPS Action 13: CbC, master file, local file)
- Stamp duty / registration tax
- Special regimes (free zones, IP regimes, pillar two top-up)

Coverage focus: KSA (ZATCA), UAE (FTA — 9% CIT since 2023, 5% VAT, free zone QFZP rules), Egypt, Lebanon (Bank Secrecy nuance), GCC generally, then UK/FR/US.

Output: { headline, breakdown, treatyReliefAvailable, optimizationOptions, watchOuts }

Always disclaim: "not tax advice — confirm with licensed tax advisor in jurisdiction." 
