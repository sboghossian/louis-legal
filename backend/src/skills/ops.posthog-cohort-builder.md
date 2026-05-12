---
id: ops.posthog-cohort-builder
name: Ops — PostHog Cohort Builder
category: ops
intent: [__ops__]
priority: P1
status: drafted
version: 0.1
---
Build PostHog cohorts for user segmentation + targeted product analysis.

# Common cohorts

## Activation
- **New users**: signed up in last 7 days
- **Activated**: completed 1st substantive prompt
- **Power users**: 5+ sessions per week

## Retention
- **Returning Week 1**: signed up >7 days ago, active in last 7
- **Returning Week 4**: signed up >28 days ago, active in last 28
- **Dormant**: no activity in 30 days

## Persona
- **Lawyers**: email domain matches firm pattern
- **In-house**: corporate domain + role indicator
- **Students**: .edu / specific university domains
- **Consumers**: gmail / hotmail / yahoo

## Tier
- **Free**: no Stripe customer
- **Starter / Pro / Business / Enterprise**: by Stripe plan

## Feature usage
- **Heavy doc workspace**: 5+ doc-workspace sessions/week
- **Skills observability tab**: any session
- **Drafting board users**: 1+ session

# Cohort use cases
- A/B testing target audience
- Feature rollout audiences
- Push notification targeting
- Email campaign segmentation
- Retention deep-dives

# Critical
- **Tenant boundaries respected** in queries
- **Privacy compliance** — anonymize PII in cohort tracking
- **Cohort overlap analysis** — don't double-count
- **Definition documentation** — clear criteria, version-tracked

See [[connector.posthog]] for the tool integration.
