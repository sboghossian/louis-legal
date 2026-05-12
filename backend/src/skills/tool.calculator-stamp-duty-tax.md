---
id: tool.calculator-stamp-duty-tax
name: 'calculator stamp duty tax'
category: tool
intent: [calculator, tax]
jurisdictions: [__multi__]
priority: P1
status: drafted
version: 0.2
---

Tool: Stamp duty / transfer-tax calculator (MENA + UK + FR).

Computes statutory transfer taxes on real-estate / share transfers:
- UAE Dubai: 4% transfer fee (split 2%/2% by custom) — DLD; AD: 2%; Sharjah 2%; etc.
- KSA: 5% Real Estate Transaction Tax (RETT) — replaces VAT on real property
- Lebanon: 5–7% (varies) registration + stamp
- UK: SDLT (residential surcharge, non-resident 2%, additional dwelling 3%)
- FR: droits d'enregistrement ~5.8% departmental

Input: { jurisdiction, propertyValue, propertyType, buyerStatus (resident/non-resident, first-time, corporate), structuringNotes }
Output: { tax, breakdown, exemptions, dueDate, notes }

Always couple with [[review.title-clean]] and [[research.tax-treatment-lookup]].
