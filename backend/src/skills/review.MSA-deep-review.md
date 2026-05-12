---
id: review.MSA-deep-review
name: MSA Deep Review
category: review
intent: ['msa review', 'review master services']
priority: P0
status: drafted
version: 0.1
---
Comprehensive review of a Master Services Agreement. ~30-60 min focus.

# Process
1. Run [[review.contract-redline]] for general structure
2. Focus on the **value-bearing clauses** specifically:

# High-leverage clauses (always inspect)
- **Liability cap**: at fees? at multiples of fees? capped at 12-month / 24-month / 36-month? carveouts (IP, confidentiality, data breach, willful misconduct, fraud)?
- **Indemnification**: scope (third-party claims only? or broader?), procedure (notice / control of defense / settlement consent), allocation between IP indemnity (Provider) and content indemnity (Client)
- **IP ownership of deliverables**: foreground IP — assigned or licensed? license back of pre-existing IP? source code access in transition? open-source disclosure?
- **Termination**: for convenience by either party? cure period for material breach? what's "material"? acceleration of fees? transition services obligations on Provider?
- **SLA**: service levels, measurement, remedies (service credits cap? excluded?)
- **Data**: DPA attached? data residency? subprocessor approval? breach notice timing (72h GDPR / faster?)
- **Audit rights**: scope, frequency, cost, confidentiality of audit findings
- **Most-favored-customer**: scope (services? pricing? all clauses?)
- **Term**: initial + renewal, notice for non-renewal, term-end pricing protections

# Output
Top-10 list with severity + recommended position + fallback position.

See [[review.indemnification-balance]] and [[review.liability-cap-reasonableness]].
