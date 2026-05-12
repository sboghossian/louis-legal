/**
 * Referral program — code generation, invite tracking, credit/payout ledger.
 *
 * In-memory. Future SQL:
 *
 * CREATE TABLE referral_codes (
 *   id uuid PRIMARY KEY,
 *   user_id text NOT NULL UNIQUE,
 *   code text NOT NULL UNIQUE,
 *   product text NOT NULL,                -- 'ai' | 'efirm'
 *   credits_balance numeric DEFAULT 0,
 *   pending_payout numeric DEFAULT 0,
 *   total_earned numeric DEFAULT 0,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * CREATE TABLE referral_invites (
 *   id uuid PRIMARY KEY,
 *   referral_code_id uuid REFERENCES referral_codes(id),
 *   invitee_email text NOT NULL,
 *   invitee_name text,
 *   stage text NOT NULL,                  -- clicked | signed_up | converted | churned
 *   reward numeric,
 *   stage_at timestamptz DEFAULT now()
 * );
 */

import crypto from "crypto";

export type Product = "ai" | "efirm";
export type InviteStage = "clicked" | "signed-up" | "converted" | "churned";

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  product: Product;
  creditsBalance: number;
  pendingPayout: number;
  totalEarned: number;
  createdAt: string;
}

export interface ReferralInvite {
  id: string;
  referralCodeId: string;
  inviteeEmail: string;
  inviteeName?: string;
  stage: InviteStage;
  reward?: number;
  stageAt: string;
}

const CODES = new Map<string, ReferralCode>();
const INVITES = new Map<string, ReferralInvite[]>();

function slug(name: string): string {
  return (name || "user").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) +
    "-" + Math.random().toString(36).slice(2, 5);
}

export function getOrCreateCode(userId: string, product: Product, displayName?: string): ReferralCode {
  const key = `${userId}::${product}`;
  const existing = Array.from(CODES.values()).find(c => c.userId === userId && c.product === product);
  if (existing) return existing;
  const code: ReferralCode = {
    id: crypto.randomUUID(),
    userId,
    code: slug(displayName || userId),
    product,
    creditsBalance: product === "ai" ? 60 : 0,
    pendingPayout: 20,
    totalEarned: 140,
    createdAt: new Date().toISOString(),
  };
  CODES.set(code.id, code);
  return code;
}

export function listMyCodes(userId: string): ReferralCode[] {
  return Array.from(CODES.values()).filter(c => c.userId === userId);
}

export function listInvites(codeId: string): ReferralInvite[] {
  return INVITES.get(codeId) || [];
}

export function inviteByEmail(codeId: string, email: string, name?: string): ReferralInvite {
  const invite: ReferralInvite = {
    id: crypto.randomUUID(),
    referralCodeId: codeId,
    inviteeEmail: email,
    inviteeName: name,
    stage: "clicked",
    stageAt: new Date().toISOString(),
  };
  const list = INVITES.get(codeId) || [];
  list.unshift(invite);
  INVITES.set(codeId, list);
  return invite;
}

export function markInviteStage(inviteId: string, stage: InviteStage, reward?: number): ReferralInvite | undefined {
  for (const list of INVITES.values()) {
    const inv = list.find(i => i.id === inviteId);
    if (inv) {
      inv.stage = stage;
      inv.stageAt = new Date().toISOString();
      if (reward !== undefined) inv.reward = reward;
      // Update the underlying code balance if converted
      if (stage === "converted" && reward) {
        const code = CODES.get(inv.referralCodeId);
        if (code) {
          code.creditsBalance += reward;
          code.totalEarned += reward;
        }
      }
      return inv;
    }
  }
  return undefined;
}

// Seed demo data
if (process.env.NODE_ENV !== "production") {
  const demoUserId = "demo";
  const aiCode = getOrCreateCode(demoUserId, "ai", "stephane");
  const efirmCode = getOrCreateCode(demoUserId, "efirm", "cabinet-stephane");
  if (listInvites(aiCode.id).length === 0) {
    inviteByEmail(aiCode.id, "layla@example.com", "Layla K.");
    inviteByEmail(aiCode.id, "omar@example.com", "Omar D.");
    inviteByEmail(aiCode.id, "ravi@example.com", "Ravi P.");
    inviteByEmail(aiCode.id, "sara@example.com", "Sara M.");
    // Mark some converted/signed-up for the demo
    const invites = INVITES.get(aiCode.id) || [];
    if (invites[0]) markInviteStage(invites[0].id, "converted", 20);
    if (invites[1]) markInviteStage(invites[1].id, "signed-up");
    if (invites[3]) markInviteStage(invites[3].id, "converted", 20);
  }
  if (listInvites(efirmCode.id).length === 0) {
    inviteByEmail(efirmCode.id, "partner@firm1.example", "Partner A");
    inviteByEmail(efirmCode.id, "partner@firm2.example", "Partner B");
    const invites = INVITES.get(efirmCode.id) || [];
    if (invites[0]) markInviteStage(invites[0].id, "converted", 0);
    if (invites[1]) markInviteStage(invites[1].id, "converted", 0);
  }
}
