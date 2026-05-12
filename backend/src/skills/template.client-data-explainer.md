---
id: template.client-data-explainer
name: Template — Client Data Explainer
category: template
intent: [__template__]
priority: P1
status: drafted
version: 0.1
---
What HAQQ does with client data — explainer for procurement reviews.

**Storage**: Supabase Postgres (EU region available)
**Processing**: AI model invocation per tenant
**Retention**: per-tenant configurable (default: 7 years for matter docs)
**Sharing**: never cross-tenant; subprocessors per DPA
**Training**: AI providers do NOT train on tenant data (per provider TOS)
**Encryption**: at rest + in transit
**Access**: RLS-enforced; tenant-scoped only
**Audit**: full audit trail accessible on request
**Deletion**: tenant-deletion = full data purge within 30 days

For formal questionnaires, see [[template.vendor-security-questionnaire-responses]].
