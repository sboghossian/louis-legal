---
id: connector.hubspot-CRM
name: Connector — HubSpot CRM
category: connector
intent: [__connector__]
priority: P0
status: drafted
version: 0.1
---
HubSpot CRM integration for sales + marketing.

# Capabilities
- Contact + company sync
- Deal stage management
- Marketing automation (email campaigns, lists)
- Custom property mapping
- Activity tracking

# Use cases
1. **Lead capture** from chat (e.g., investor inquiry → HubSpot lead)
2. **Deal stage routing** based on signup → trial → paid
3. **Email campaign segmentation** by persona + tier
4. **Sales handoff** from chat to human (see [[justice.human-handoff]])
5. **Customer success** monitoring

# Property mapping (Stripe → HubSpot sync)
- Stripe customer ID → HubSpot company custom property
- Stripe subscription status → deal stage
- Plan tier → HubSpot lifecycle stage
- Last payment date → HubSpot custom date field

# Hand-off triggers
- Sales: enterprise interest, demo request, partnership inquiry
- Support: bug reports, account issues
- CS: trial conversion, churn risk

# Critical
- **Tenant isolation** — each tenant has own HubSpot org
- **No cross-tenant data leakage**
- **Audit logs** for sales rep access

See [[ops.hubspot-deal-stage-router]] for the deal-stage logic.
