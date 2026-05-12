/**
 * Team store — members, roles, invitations.
 *
 * SQL (future):
 *
 * CREATE TABLE teams (
 *   id uuid PRIMARY KEY,
 *   name text NOT NULL,
 *   owner_user_id text NOT NULL,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * CREATE TABLE team_members (
 *   id uuid PRIMARY KEY,
 *   team_id uuid REFERENCES teams(id),
 *   user_id text,                          -- null until invite accepted
 *   email text NOT NULL,
 *   name text,
 *   role text NOT NULL,                    -- owner | admin | member | viewer
 *   status text NOT NULL,                  -- invited | active | suspended
 *   invited_by text,
 *   invited_at timestamptz DEFAULT now(),
 *   joined_at timestamptz,
 *   last_active_at timestamptz
 * );
 */

import crypto from "crypto";

export type Role = "owner" | "admin" | "member" | "viewer";
export type MemberStatus = "invited" | "active" | "suspended";

export interface Team {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId?: string;
  email: string;
  name?: string;
  role: Role;
  status: MemberStatus;
  invitedBy?: string;
  invitedAt: string;
  joinedAt?: string;
  lastActiveAt?: string;
}

const TEAMS = new Map<string, Team>();
const MEMBERS = new Map<string, TeamMember>();

export function getOrCreateTeam(userId: string, name?: string): Team {
  for (const t of TEAMS.values()) {
    if (t.ownerUserId === userId) return t;
  }
  const team: Team = {
    id: crypto.randomUUID(),
    name: name || "My Team",
    ownerUserId: userId,
    createdAt: new Date().toISOString(),
  };
  TEAMS.set(team.id, team);
  // Owner gets a member record too
  const ownerMember: TeamMember = {
    id: crypto.randomUUID(),
    teamId: team.id,
    userId,
    email: `${userId}@louis.demo`,
    name: "Owner",
    role: "owner",
    status: "active",
    invitedAt: team.createdAt,
    joinedAt: team.createdAt,
    lastActiveAt: team.createdAt,
  };
  MEMBERS.set(ownerMember.id, ownerMember);
  return team;
}

export function getTeam(teamId: string): Team | undefined {
  return TEAMS.get(teamId);
}

export function listMembers(teamId: string): TeamMember[] {
  return Array.from(MEMBERS.values())
    .filter(m => m.teamId === teamId)
    .sort((a, b) => {
      const order: Record<Role, number> = { owner: 0, admin: 1, member: 2, viewer: 3 };
      return order[a.role] - order[b.role];
    });
}

export function inviteMember(teamId: string, email: string, role: Role = "member", invitedBy?: string, name?: string): TeamMember {
  const m: TeamMember = {
    id: crypto.randomUUID(),
    teamId,
    email,
    name,
    role,
    status: "invited",
    invitedBy,
    invitedAt: new Date().toISOString(),
  };
  MEMBERS.set(m.id, m);
  return m;
}

export function acceptInvite(memberId: string, userId: string): TeamMember | undefined {
  const m = MEMBERS.get(memberId);
  if (!m) return undefined;
  m.userId = userId;
  m.status = "active";
  m.joinedAt = new Date().toISOString();
  m.lastActiveAt = m.joinedAt;
  return m;
}

export function updateMember(memberId: string, updates: Partial<TeamMember>): TeamMember | undefined {
  const m = MEMBERS.get(memberId);
  if (!m) return undefined;
  if (updates.role) m.role = updates.role;
  if (updates.status) m.status = updates.status;
  return m;
}

export function removeMember(memberId: string): boolean {
  return MEMBERS.delete(memberId);
}

export interface Permission {
  resource: string;
  action: "read" | "write" | "delete" | "invite" | "billing";
}

export function hasPermission(role: Role, permission: Permission): boolean {
  // Owner can do anything
  if (role === "owner") return true;
  // Admin can do everything except billing
  if (role === "admin") return permission.action !== "billing";
  // Member can read/write matters, skills, etc. but not invite or billing or delete others' work
  if (role === "member") return permission.action === "read" || permission.action === "write";
  // Viewer is read-only
  if (role === "viewer") return permission.action === "read";
  return false;
}

export const ROLE_DESCRIPTIONS: Record<Role, { name: string; description: string; permissions: string[] }> = {
  owner: {
    name: "Owner",
    description: "Full control. Manages billing. One per team.",
    permissions: ["All admin permissions", "Manage billing + subscription", "Transfer ownership", "Delete team"],
  },
  admin: {
    name: "Admin",
    description: "Manages members + settings. Cannot change billing.",
    permissions: ["Invite + remove members", "Change member roles (except owner)", "Manage integrations + API keys", "Edit all matters + skills"],
  },
  member: {
    name: "Member",
    description: "Standard collaborator. Read + write across the team.",
    permissions: ["Read + write matters, skills, routines", "Use AI features", "Cannot invite or remove members", "Cannot manage integrations / API keys"],
  },
  viewer: {
    name: "Viewer",
    description: "Read-only. Useful for clients, auditors, observers.",
    permissions: ["Read matters + skills + routines", "Cannot create or edit anything", "Cannot use AI features"],
  },
};
