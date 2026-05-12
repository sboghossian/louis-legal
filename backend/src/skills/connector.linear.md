---
id: connector.linear
name: Connector — Linear
category: connector
intent: [__connector__]
priority: P0
status: drafted
version: 0.1
---
Linear (issue tracker) integration.

# Capabilities
- Read issues by ID
- Search issues by query, label, assignee
- Create new issues (bug reports, feature requests)
- Update issue status
- List teams + projects
- Watch issues for status changes

# Use cases
1. **Auto bug reports** from chat ([[ops.bug-report-collector]])
2. **Feature request collection** ([[ops.feature-request-collector]])
3. **Sprint planning** integration
4. **Status dashboards**
5. **Pull request linking**

# Setup
- OAuth or PAT-based authentication
- Workspace + team selection
- Webhook subscriptions for updates

# Permissions
- Read access for chat queries
- Write access for issue creation (with user confirmation)
- Admin access only for senior users

# Audit
All chat-driven Linear actions logged with user ID + timestamp.

# Tenant isolation
Each tenant connects their own Linear workspace; cross-tenant prohibited.
