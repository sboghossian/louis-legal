/**
 * Integrations store — tracks which third-party integrations a user has
 * connected, with auth state (oauth tokens stored elsewhere; this just
 * tracks status + last-used).
 *
 * CREATE TABLE integrations (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id text NOT NULL,
 *   integration_id text NOT NULL,
 *   status text NOT NULL,                  -- 'connected' | 'disconnected' | 'needs-reauth'
 *   config jsonb DEFAULT '{}',             -- workspace ids, project keys, etc.
 *   connected_at timestamptz,
 *   last_used_at timestamptz,
 *   created_at timestamptz DEFAULT now(),
 *   updated_at timestamptz DEFAULT now()
 * );
 *
 * CREATE UNIQUE INDEX one_per_user_per_integration ON integrations (user_id, integration_id);
 */

import crypto from "crypto";

export type IntegrationStatus = "connected" | "disconnected" | "needs-reauth" | "coming-soon";

export interface IntegrationCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: "legal-tool" | "productivity" | "communication" | "billing" | "ai-mcp" | "developer" | "research";
  iconHint?: string;
  authType: "oauth" | "api-key" | "url" | "none";
  signupUrl?: string;
  defaultStatus?: IntegrationStatus;
}

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  // Legal tools
  { id: "openclaw", name: "OpenClaw", description: "Open-source legal case management — sync matters bidirectionally", category: "legal-tool", authType: "oauth", signupUrl: "https://openclaw.org" },
  { id: "ms-word", name: "Microsoft Word", description: "Office Add-in for in-document drafting, redline, risk scan", category: "legal-tool", authType: "oauth", signupUrl: "https://appsource.microsoft.com" },
  { id: "google-docs", name: "Google Docs", description: "Real-time co-authoring + suggestion sync", category: "productivity", authType: "oauth" },
  { id: "tawqi3i", name: "Tawqi3i", description: "Lebanese qualified e-signature — execution layer", category: "legal-tool", authType: "api-key", defaultStatus: "coming-soon" },
  { id: "docusign", name: "DocuSign", description: "Cross-border e-signature with audit trail", category: "legal-tool", authType: "oauth" },
  { id: "uae-pass", name: "UAE Pass", description: "PKI-based identity + signature for UAE government workflows", category: "legal-tool", authType: "oauth", defaultStatus: "coming-soon" },
  { id: "legal-data-hunter", name: "Legal Data Hunter", description: "HAQQ's MENA legal corpus scraper — Gulf gazettes + bar association notices", category: "research", authType: "api-key" },
  { id: "westlaw", name: "Westlaw", description: "Thomson Reuters research + KeyCite citator", category: "research", authType: "api-key" },
  { id: "lexisnexis", name: "LexisNexis", description: "MENA + global case law + Shepard's citator", category: "research", authType: "api-key" },
  { id: "courtlistener", name: "CourtListener", description: "Free US federal + state case law (public API)", category: "research", authType: "none" },
  { id: "eur-lex", name: "EUR-Lex", description: "Official EU legal text + CJEU case law", category: "research", authType: "none" },
  { id: "legifrance", name: "Legifrance", description: "Official French legal codes + case law", category: "research", authType: "none" },
  { id: "wipo-trademark", name: "WIPO Brand DB", description: "Global trademark search across Madrid + national feeds", category: "research", authType: "api-key" },
  { id: "companies-house-uk", name: "Companies House (UK)", description: "Free UK corporate registry — KYC + UBO research", category: "research", authType: "api-key" },
  { id: "sec-edgar", name: "SEC EDGAR", description: "US public company filings (10-K, 8-K, S-1, etc.)", category: "research", authType: "none" },

  // Productivity
  { id: "gmail", name: "Gmail", description: "Matter-linked email tracking + draft generation", category: "communication", authType: "oauth" },
  { id: "outlook", name: "Outlook", description: "Office 365 mail + calendar", category: "communication", authType: "oauth" },
  { id: "google-calendar", name: "Google Calendar", description: "Court dates, deadlines, deep-work blocks", category: "productivity", authType: "oauth" },
  { id: "slack", name: "Slack", description: "Routines + alerts delivery channel", category: "communication", authType: "oauth" },
  { id: "whatsapp", name: "WhatsApp", description: "Client handoff via WhatsApp Business", category: "communication", authType: "api-key" },
  { id: "notion", name: "Notion", description: "Knowledge-base import/export + matter notes", category: "productivity", authType: "oauth" },
  { id: "google-drive", name: "Google Drive", description: "Doc workspace source of truth", category: "productivity", authType: "oauth" },

  // Billing & CRM
  { id: "stripe", name: "Stripe", description: "Billing + subscription management", category: "billing", authType: "api-key" },
  { id: "hubspot", name: "HubSpot", description: "CRM context for matters + prospects", category: "billing", authType: "oauth" },
  { id: "quickbooks", name: "QuickBooks", description: "Firm accounting + trust accounts", category: "billing", authType: "oauth" },
  { id: "xero", name: "Xero", description: "Alternative accounting + payroll", category: "billing", authType: "oauth" },

  // AI / MCP
  { id: "mcp-server", name: "MCP Server (custom)", description: "Connect any Model Context Protocol server by URL", category: "ai-mcp", authType: "url" },
  { id: "cocounsel", name: "Thomson Reuters CoCounsel", description: "Hand off long-form research to TR's legal AI", category: "ai-mcp", authType: "api-key" },
  { id: "harvey", name: "Harvey", description: "Cross-platform clause library import", category: "ai-mcp", authType: "api-key", defaultStatus: "coming-soon" },

  // Developer
  { id: "github", name: "GitHub", description: "Custom skills / clauses repo — Louis pulls + watches", category: "developer", authType: "oauth" },
  { id: "linear", name: "Linear", description: "Issue tracking — auto-create bugs from chat", category: "developer", authType: "oauth" },
  { id: "posthog", name: "PostHog", description: "Product analytics + skill telemetry", category: "developer", authType: "api-key" },
  { id: "cloudflare", name: "Cloudflare", description: "DNS, Pages, Workers, R2 management via MCP", category: "developer", authType: "api-key" },
  { id: "figma", name: "Figma", description: "Design tokens + Code Connect mappings", category: "developer", authType: "oauth" },
];

export interface UserIntegration {
  id: string;
  userId: string;
  integrationId: string;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  connectedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const USER_INTEGRATIONS = new Map<string, UserIntegration>();

function key(userId: string, integrationId: string): string {
  return `${userId}::${integrationId}`;
}

export function getUserIntegration(userId: string, integrationId: string): UserIntegration | undefined {
  return USER_INTEGRATIONS.get(key(userId, integrationId));
}

export function listUserIntegrations(userId: string): UserIntegration[] {
  return Array.from(USER_INTEGRATIONS.values()).filter(i => i.userId === userId);
}

export function connectIntegration(userId: string, integrationId: string, config: Record<string, unknown> = {}): UserIntegration {
  const now = new Date().toISOString();
  const existing = USER_INTEGRATIONS.get(key(userId, integrationId));
  const updated: UserIntegration = {
    id: existing?.id || crypto.randomUUID(),
    userId,
    integrationId,
    status: "connected",
    config,
    connectedAt: existing?.connectedAt || now,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  USER_INTEGRATIONS.set(key(userId, integrationId), updated);
  return updated;
}

export function disconnectIntegration(userId: string, integrationId: string): UserIntegration | undefined {
  const existing = USER_INTEGRATIONS.get(key(userId, integrationId));
  if (!existing) return undefined;
  existing.status = "disconnected";
  existing.updatedAt = new Date().toISOString();
  return existing;
}

export function markUsed(userId: string, integrationId: string): void {
  const existing = USER_INTEGRATIONS.get(key(userId, integrationId));
  if (existing) existing.lastUsedAt = new Date().toISOString();
}

// Seed demo: PostHog + CourtListener pre-connected
if (process.env.NODE_ENV !== "production") {
  connectIntegration("demo", "posthog");
  connectIntegration("demo", "courtlistener");
  connectIntegration("demo", "eur-lex");
}
