---
id: draft.SLA
name: Service Level Agreement (SLA)
category: draft
practice_area: corporate
intent: [sla, 'service level']
priority: P0
status: drafted
version: 0.1
---
Draft a Service Level Agreement specifying measurable performance commitments.

# Required inputs
1. Service description (which service is being SLAd)
2. Service levels (availability %, response time, resolution time)
3. Measurement methodology (uptime monitoring, ticket timestamps)
4. Service credits (remedy formula tied to credit %)
5. Exclusions (planned maintenance, force majeure)

# Standard SLA tiers
- 99.5% uptime = ~3.65h downtime/month
- 99.9% uptime = ~43min downtime/month
- 99.95% uptime = ~22min downtime/month
- 99.99% uptime = ~4.4min downtime/month

# Structure
1. Service description
2. Service levels (each with target, measurement window, measurement method)
3. Credits formula (graduated by miss severity)
4. Credit application (auto-credit vs claim-based)
5. Exclusions: planned maintenance windows (with notice requirements), force majeure, Client-caused
6. Reporting (monthly availability report; raw data on request)
7. Termination right at sustained misses (e.g., 3 consecutive months below 95%)

# Common Provider/Client tension
- Provider wants credits as **sole and exclusive remedy** capped at fees
- Client wants credits + termination right + carve-out for material misses
- Negotiation axis: credit cap as % of monthly fees (typical 5-25%); termination threshold

See [[draft.MSA]] and [[draft.SOW]].
