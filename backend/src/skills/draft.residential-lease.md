---
id: draft.residential-lease
name: Residential Lease
category: draft
practice_area: real-estate
intent: [lease, 'residential lease', tenancy, 'rental agreement']
required_inputs: [landlord, tenant, property_address, rent, term, jurisdiction]
priority: P0
status: drafted
version: 0.1
---
Draft a residential lease. Adapt to jurisdiction-specific landlord-tenant law.

# Required inputs
1. Landlord (name, ID/CR)
2. Tenant (name, ID, dependents if any)
3. Property: address, area, condition, inventory of fixtures
4. Rent: amount, currency, payment frequency, payment method
5. Term: start, duration, end
6. Security deposit: amount, conditions for return

# Jurisdictional differences (critical)
- **LB**: Old Rent Law (pre-1992) vs New Rent Law (post-1992). Renewal protections under Law 160/1992. Default new lease = 3-year term.
- **UAE-Dubai**: RERA registration mandatory; rent disputes go to RDC (Rental Disputes Centre); Decree 26/2013 + Decree 43/2013 cap rent increases.
- **UAE-Abu Dhabi**: Tawtheeq registration mandatory.
- **KSA**: Ejar electronic registration mandatory.
- **FR**: Statutory protections under Loi du 6 juillet 1989 for primary residences.

# Standard clauses
1. Property description (with annexed inventory)
2. Use restriction (residential only, no commercial activity)
3. Term and renewal (state which jurisdictional statute governs; many systems give tenant renewal rights)
4. Rent: amount, due dates, late-payment interest, increase mechanism (capped per local law)
5. Security deposit: held in escrow / refundable conditions
6. Maintenance: landlord obligations (structural) vs tenant obligations (interior, minor repairs)
7. Utilities allocation
8. Insurance (contents — tenant; building — landlord)
9. Subletting (default prohibited without consent)
10. Termination: notice periods, grounds for early termination by either party
11. Inventory check-out (deduction conditions on deposit)
12. Dispute resolution (specify the local rental disputes body)
13. Governing law

# Eviction notice templates
See [[draft.eviction-notice]].

# Common landlord vs tenant negotiation points
- Rent escalation
- Maintenance allocation (HVAC, plumbing major)
- Pet policy
- Renewal rent reset basis (market vs CPI vs fixed)

Use [[review.lease-tenant-side]] or [[review.lease-landlord-side]] for side-aware review.
