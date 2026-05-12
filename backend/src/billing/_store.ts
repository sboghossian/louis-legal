/**
 * Billing store — Stripe-aware (simulated in-memory until a real Stripe key
 * is configured in /integrations).
 *
 * SQL (future):
 *
 * CREATE TABLE subscriptions (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id text NOT NULL,
 *   stripe_customer_id text,
 *   stripe_subscription_id text,
 *   plan_id text NOT NULL,
 *   status text NOT NULL,                 -- active | past_due | canceled | trialing
 *   current_period_start timestamptz,
 *   current_period_end timestamptz,
 *   cancel_at_period_end boolean DEFAULT false,
 *   trial_ends_at timestamptz,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * CREATE TABLE credit_ledger (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id text NOT NULL,
 *   delta integer NOT NULL,               -- + grant, - usage
 *   reason text NOT NULL,
 *   metadata jsonb,
 *   created_at timestamptz DEFAULT now()
 * );
 *
 * CREATE TABLE invoices (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id text NOT NULL,
 *   stripe_invoice_id text,
 *   amount_due_cents integer NOT NULL,
 *   currency text DEFAULT 'usd',
 *   status text NOT NULL,                 -- draft | open | paid | void | uncollectible
 *   period_start timestamptz,
 *   period_end timestamptz,
 *   pdf_url text,
 *   created_at timestamptz DEFAULT now()
 * );
 */

import crypto from "crypto";

export type PlanId = "free" | "starter" | "pro" | "business" | "enterprise";
export type SubStatus = "active" | "past_due" | "canceled" | "trialing";
export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible";

export interface Plan {
  id: PlanId;
  name: string;
  priceCents: number;     // 0 for free; -1 for "contact us"
  currency: "usd";
  interval: "month";
  description: string;
  features: string[];
  monthlyCredits: number;
  teamSeats: number;       // 0 = single-user only
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free (BYO keys)",
    priceCents: 0,
    currency: "usd",
    interval: "month",
    description: "All features. Bring your own API keys for Claude / OpenAI / Gemini.",
    features: ["All 982 skills", "Clause library + risk + citations + EOS", "Matters + routines", "Custom skills", "Local-only data"],
    monthlyCredits: 0,
    teamSeats: 1,
  },
  {
    id: "starter",
    name: "Starter",
    priceCents: 1900,
    currency: "usd",
    interval: "month",
    description: "Hosted Claude + Gemini. 25,000 monthly credits.",
    features: ["Everything in Free", "Hosted model access", "25k monthly credits", "Email support"],
    monthlyCredits: 25_000,
    teamSeats: 1,
  },
  {
    id: "pro",
    name: "Pro",
    priceCents: 4900,
    currency: "usd",
    interval: "month",
    description: "100,000 credits + matter management + priority support.",
    features: ["Everything in Starter", "100k monthly credits", "Matter management", "Priority chat support", "Audit log"],
    monthlyCredits: 100_000,
    teamSeats: 1,
  },
  {
    id: "business",
    name: "Business",
    priceCents: 19900,
    currency: "usd",
    interval: "month",
    description: "Up to 10 seats + e-Firm features + SSO + SAML.",
    features: ["Everything in Pro", "10 team seats", "e-Firm dashboard", "SSO / SAML", "Role-based permissions", "MENA data residency"],
    monthlyCredits: 500_000,
    teamSeats: 10,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceCents: -1,
    currency: "usd",
    interval: "month",
    description: "Custom terms, unlimited seats, dedicated infrastructure.",
    features: ["Everything in Business", "Unlimited seats", "Dedicated infrastructure", "Custom contracting", "Dedicated CSM", "SOC 2 + HIPAA on request"],
    monthlyCredits: -1,
    teamSeats: -1,
  },
];

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  planId: PlanId;
  status: SubStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Invoice {
  id: string;
  userId: string;
  stripeInvoiceId?: string;
  amountDueCents: number;
  currency: "usd";
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  pdfUrl?: string;
  createdAt: string;
}

const SUBSCRIPTIONS = new Map<string, Subscription>();
const LEDGER: CreditLedgerEntry[] = [];
const INVOICES: Invoice[] = [];

function defaultSubscription(userId: string): Subscription {
  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);
  return {
    id: crypto.randomUUID(),
    userId,
    planId: "free",
    status: "active",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: end.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
  };
}

export function getSubscription(userId: string): Subscription {
  for (const s of SUBSCRIPTIONS.values()) {
    if (s.userId === userId) return s;
  }
  const sub = defaultSubscription(userId);
  SUBSCRIPTIONS.set(sub.id, sub);
  return sub;
}

export function changePlan(userId: string, planId: PlanId): Subscription {
  const sub = getSubscription(userId);
  sub.planId = planId;
  sub.status = "active";
  sub.cancelAtPeriodEnd = false;

  // Grant the new plan's monthly credits
  const plan = PLANS.find(p => p.id === planId);
  if (plan && plan.monthlyCredits > 0) {
    LEDGER.unshift({
      id: crypto.randomUUID(),
      userId,
      delta: plan.monthlyCredits,
      reason: `plan upgrade to ${plan.name}`,
      createdAt: new Date().toISOString(),
    });
    // Generate an invoice for paid plans
    if (plan.priceCents > 0) {
      INVOICES.unshift({
        id: crypto.randomUUID(),
        userId,
        amountDueCents: plan.priceCents,
        currency: "usd",
        status: "paid",
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return sub;
}

export function cancelSubscription(userId: string): Subscription {
  const sub = getSubscription(userId);
  sub.cancelAtPeriodEnd = true;
  return sub;
}

export function reactivateSubscription(userId: string): Subscription {
  const sub = getSubscription(userId);
  sub.cancelAtPeriodEnd = false;
  return sub;
}

export function getCreditBalance(userId: string): number {
  let balance = 0;
  for (const e of LEDGER) {
    if (e.userId === userId) balance += e.delta;
  }
  return Math.max(0, balance);
}

export function getCreditHistory(userId: string, limit = 50): CreditLedgerEntry[] {
  return LEDGER.filter(e => e.userId === userId).slice(0, limit);
}

export function consumeCredits(userId: string, amount: number, reason: string, metadata?: Record<string, unknown>): boolean {
  const balance = getCreditBalance(userId);
  if (balance < amount) return false;
  LEDGER.unshift({
    id: crypto.randomUUID(),
    userId,
    delta: -amount,
    reason,
    metadata,
    createdAt: new Date().toISOString(),
  });
  return true;
}

export function getInvoices(userId: string): Invoice[] {
  return INVOICES.filter(i => i.userId === userId);
}

/**
 * Open a Stripe customer portal session URL. In production this calls
 * stripe.billingPortal.sessions.create. Here we return a placeholder so
 * the UI flow is testable without Stripe configured.
 */
export function openPortalSession(userId: string): { url: string; live: boolean } {
  const apiKey = process.env.STRIPE_API_KEY;
  if (!apiKey) {
    return {
      url: `/billing?portal=unconfigured`,
      live: false,
    };
  }
  // Real Stripe integration would happen here:
  // const session = await stripe.billingPortal.sessions.create({
  //   customer: sub.stripeCustomerId,
  //   return_url: `${process.env.FRONTEND_URL}/billing`,
  // });
  // return { url: session.url, live: true };
  return { url: `/billing?portal=stub`, live: true };
}

// Seed demo data
if (process.env.NODE_ENV !== "production") {
  const sub = getSubscription("demo");
  // Give demo user some credits to play with
  LEDGER.unshift({
    id: crypto.randomUUID(),
    userId: "demo",
    delta: 5000,
    reason: "demo grant",
    createdAt: new Date().toISOString(),
  });
  // Simulate some usage
  LEDGER.unshift({
    id: crypto.randomUUID(),
    userId: "demo",
    delta: -243,
    reason: "chat turn (claude-opus-4-7)",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  });
  LEDGER.unshift({
    id: crypto.randomUUID(),
    userId: "demo",
    delta: -89,
    reason: "skill router classification",
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  });
}
