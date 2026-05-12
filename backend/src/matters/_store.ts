/**
 * Matter Management — in-memory store (Supabase schema-creation blocked by
 * classifier; document the SQL for future migration).
 *
 * Future SQL (for Supabase migration when permitted):
 *
 * CREATE TABLE matters (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id text NOT NULL,
 *   matter_number text NOT NULL,        -- firm-specific reference like "2026-007"
 *   client_name text NOT NULL,
 *   matter_type text NOT NULL,           -- "litigation" | "transactional" | "advisory" | "regulatory" | "other"
 *   practice_area text,                  -- "corporate" | "employment" | "real-estate" | etc.
 *   status text NOT NULL DEFAULT 'open', -- "open" | "on-hold" | "closed" | "withdrawn"
 *   jurisdictions text[],
 *   parties jsonb,                       -- [{ name, role, type, identification }]
 *   description text,
 *   responsible_attorney text,
 *   opened_at timestamptz NOT NULL DEFAULT now(),
 *   closed_at timestamptz,
 *   budget_amount numeric,
 *   budget_currency text DEFAULT 'AED',
 *   created_at timestamptz NOT NULL DEFAULT now(),
 *   updated_at timestamptz NOT NULL DEFAULT now()
 * );
 *
 * CREATE INDEX matters_user_id_idx ON matters (user_id);
 * CREATE INDEX matters_status_idx ON matters (status);
 *
 * CREATE TABLE matter_events (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   matter_id uuid NOT NULL REFERENCES matters(id),
 *   event_type text NOT NULL,      -- "note" | "deadline" | "filing" | "communication" | "conflict-check" | "billing"
 *   description text NOT NULL,
 *   event_date date,
 *   metadata jsonb,
 *   created_by text,
 *   created_at timestamptz NOT NULL DEFAULT now()
 * );
 */

import crypto from "crypto";

export type MatterStatus = "open" | "on-hold" | "closed" | "withdrawn";
export type MatterType = "litigation" | "transactional" | "advisory" | "regulatory" | "ip" | "family" | "other";
export type PartyRole = "client" | "counterparty" | "co-defendant" | "co-plaintiff" | "third-party" | "witness" | "expert" | "regulator";

export interface MatterParty {
  name: string;
  role: PartyRole;
  type: "individual" | "entity";
  identification?: string; // CR number, passport, etc.
  jurisdiction?: string;
}

export interface MatterEvent {
  id: string;
  matterId: string;
  eventType: "note" | "deadline" | "filing" | "communication" | "conflict-check" | "billing" | "status-change";
  description: string;
  eventDate?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  createdAt: string;
}

export interface Matter {
  id: string;
  userId: string;
  matterNumber: string;
  clientName: string;
  matterType: MatterType;
  practiceArea?: string;
  status: MatterStatus;
  jurisdictions: string[];
  parties: MatterParty[];
  description?: string;
  responsibleAttorney?: string;
  openedAt: string;
  closedAt?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  createdAt: string;
  updatedAt: string;
}

const MATTERS = new Map<string, Matter>();
const EVENTS = new Map<string, MatterEvent[]>();

export function createMatter(input: Omit<Matter, "id" | "createdAt" | "updatedAt" | "openedAt"> & { openedAt?: string }): Matter {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const matter: Matter = {
    ...input,
    id,
    openedAt: input.openedAt || now,
    createdAt: now,
    updatedAt: now,
  };
  MATTERS.set(id, matter);
  EVENTS.set(id, []);
  addEvent(id, {
    eventType: "status-change",
    description: `Matter opened by ${input.responsibleAttorney || input.userId}.`,
    createdBy: input.userId,
  });
  return matter;
}

export function getMatter(id: string, userId: string): Matter | undefined {
  const m = MATTERS.get(id);
  if (!m || m.userId !== userId) return undefined;
  return m;
}

export function listMatters(userId: string, filters: { status?: MatterStatus; matterType?: MatterType; q?: string } = {}): Matter[] {
  const results = Array.from(MATTERS.values()).filter(m => m.userId === userId);
  return results.filter(m => {
    if (filters.status && m.status !== filters.status) return false;
    if (filters.matterType && m.matterType !== filters.matterType) return false;
    if (filters.q) {
      const needle = filters.q.toLowerCase();
      const hay = (m.clientName + " " + m.matterNumber + " " + (m.description || "") + " " + m.parties.map(p => p.name).join(" ")).toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function updateMatter(id: string, userId: string, updates: Partial<Matter>): Matter | undefined {
  const m = MATTERS.get(id);
  if (!m || m.userId !== userId) return undefined;
  const updated: Matter = {
    ...m,
    ...updates,
    id: m.id,
    userId: m.userId,
    createdAt: m.createdAt,
    updatedAt: new Date().toISOString(),
  };
  MATTERS.set(id, updated);

  if (updates.status && updates.status !== m.status) {
    addEvent(id, {
      eventType: "status-change",
      description: `Status changed from ${m.status} to ${updates.status}.`,
      createdBy: userId,
    });
    if (updates.status === "closed" && !updated.closedAt) {
      updated.closedAt = new Date().toISOString();
      MATTERS.set(id, updated);
    }
  }
  return updated;
}

export function deleteMatter(id: string, userId: string): boolean {
  const m = MATTERS.get(id);
  if (!m || m.userId !== userId) return false;
  MATTERS.delete(id);
  EVENTS.delete(id);
  return true;
}

export function addEvent(matterId: string, event: Omit<MatterEvent, "id" | "createdAt" | "matterId">): MatterEvent {
  const fullEvent: MatterEvent = {
    ...event,
    id: crypto.randomUUID(),
    matterId,
    createdAt: new Date().toISOString(),
  };
  const events = EVENTS.get(matterId) || [];
  events.unshift(fullEvent);
  EVENTS.set(matterId, events);
  // Also bump updatedAt
  const m = MATTERS.get(matterId);
  if (m) {
    m.updatedAt = fullEvent.createdAt;
  }
  return fullEvent;
}

export function listEvents(matterId: string): MatterEvent[] {
  return EVENTS.get(matterId) || [];
}

/**
 * Conflict check: for each prospective party, scan existing matters for
 * the same party name on opposing roles.
 */
export interface ConflictHit {
  matterId: string;
  matterNumber: string;
  clientName: string;
  status: MatterStatus;
  party: MatterParty;
  conflictReason: string;
}

export function runConflictCheck(userId: string, prospectiveParties: { name: string; role: PartyRole }[]): ConflictHit[] {
  const hits: ConflictHit[] = [];
  const userMatters = Array.from(MATTERS.values()).filter(m => m.userId === userId);

  for (const matter of userMatters) {
    for (const existingParty of matter.parties) {
      for (const newParty of prospectiveParties) {
        // Fuzzy name match: case-insensitive, alphabetic-only contains
        const existing = norm(existingParty.name);
        const proposed = norm(newParty.name);
        const matches =
          existing === proposed ||
          existing.includes(proposed) ||
          proposed.includes(existing) ||
          // Tokenized overlap (handles "Acme Corp" vs "Acme Corporation")
          tokenOverlap(existingParty.name, newParty.name) >= 0.6;
        if (!matches) continue;

        // Opposing roles?
        const opposingPair =
          (existingParty.role === "client" && (newParty.role === "counterparty" || newParty.role === "co-defendant")) ||
          (existingParty.role === "counterparty" && (newParty.role === "client" || newParty.role === "co-plaintiff")) ||
          // Same party on different side
          (existingParty.role !== newParty.role);

        if (opposingPair || matter.status === "open") {
          hits.push({
            matterId: matter.id,
            matterNumber: matter.matterNumber,
            clientName: matter.clientName,
            status: matter.status,
            party: existingParty,
            conflictReason:
              existingParty.role === newParty.role
                ? `Same party "${existingParty.name}" already a ${existingParty.role} in matter ${matter.matterNumber}.`
                : `Party "${existingParty.name}" is a ${existingParty.role} in matter ${matter.matterNumber}; now proposed as ${newParty.role}.`,
          });
        }
      }
    }
  }

  return hits;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, "");
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  const tb = new Set(b.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersect = 0;
  for (const t of ta) {
    if (tb.has(t)) intersect++;
  }
  return intersect / Math.min(ta.size, tb.size);
}

/**
 * Stats for dashboard
 */
export function matterStats(userId: string) {
  const matters = Array.from(MATTERS.values()).filter(m => m.userId === userId);
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byJurisdiction: Record<string, number> = {};
  for (const m of matters) {
    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    byType[m.matterType] = (byType[m.matterType] || 0) + 1;
    for (const j of m.jurisdictions) {
      byJurisdiction[j] = (byJurisdiction[j] || 0) + 1;
    }
  }
  return {
    total: matters.length,
    byStatus,
    byType,
    byJurisdiction,
  };
}

// Seed with demo data when running locally
if (process.env.NODE_ENV !== "production") {
  // Demo matter to make the empty state useful
  const demoUserId = "demo";
  if (!Array.from(MATTERS.values()).find(m => m.userId === demoUserId)) {
    createMatter({
      userId: demoUserId,
      matterNumber: "2026-001",
      clientName: "Acme Trading LLC",
      matterType: "transactional",
      practiceArea: "corporate",
      status: "open",
      jurisdictions: ["UAE-DIFC", "UAE"],
      parties: [
        { name: "Acme Trading LLC", role: "client", type: "entity", jurisdiction: "UAE-DIFC", identification: "DIFC-1234" },
        { name: "Globex Industries FZE", role: "counterparty", type: "entity", jurisdiction: "UAE", identification: "JAFZA-9876" },
      ],
      description: "MSA negotiation between Acme (DIFC) and Globex (JAFZA) for IT services. Includes DPA addendum.",
      responsibleAttorney: "Stephane Boghossian",
      budgetAmount: 35000,
      budgetCurrency: "AED",
    });
    createMatter({
      userId: demoUserId,
      matterNumber: "2026-002",
      clientName: "Beirut Family Holdings",
      matterType: "advisory",
      practiceArea: "corporate",
      status: "open",
      jurisdictions: ["LB", "FR"],
      parties: [
        { name: "Beirut Family Holdings SAL", role: "client", type: "entity", jurisdiction: "LB" },
      ],
      description: "Restructuring advice for Lebanese family group with French operations. Tax + corporate.",
      responsibleAttorney: "Stephane Boghossian",
    });
    createMatter({
      userId: demoUserId,
      matterNumber: "2025-099",
      clientName: "Tech Founder X",
      matterType: "litigation",
      practiceArea: "employment",
      status: "closed",
      jurisdictions: ["UAE"],
      parties: [
        { name: "Tech Founder X", role: "client", type: "individual", jurisdiction: "UAE" },
        { name: "PrevEmployer LLC", role: "counterparty", type: "entity", jurisdiction: "UAE" },
      ],
      description: "EOSB dispute — settled at mediation. Closed Nov 2025.",
      responsibleAttorney: "Stephane Boghossian",
    });
  }
}
