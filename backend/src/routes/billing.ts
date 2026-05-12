import { Router, Request, Response } from "express";
import { PLANS, PlanId, getSubscription, changePlan, cancelSubscription, reactivateSubscription, getCreditBalance, getCreditHistory, getInvoices, openPortalSession, consumeCredits } from "../billing/_store";

export const billingRouter = Router();

function userIdFrom(req: Request, res: Response): string {
  return (req.headers["x-user-id"] as string) || (res.locals?.userId as string) || "demo";
}

billingRouter.get("/plans", (_req: Request, res: Response) => {
  res.json({ plans: PLANS });
});

billingRouter.get("/subscription", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const sub = getSubscription(userId);
  const plan = PLANS.find(p => p.id === sub.planId);
  res.json({
    subscription: sub,
    plan,
    creditBalance: getCreditBalance(userId),
    stripeLive: !!process.env.STRIPE_API_KEY,
  });
});

billingRouter.post("/change-plan", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const { planId } = req.body ?? {};
  if (!planId || !PLANS.find(p => p.id === planId)) {
    res.status(400).json({ error: "valid planId required" });
    return;
  }
  const sub = changePlan(userId, planId as PlanId);
  res.json({ subscription: sub, plan: PLANS.find(p => p.id === planId) });
});

billingRouter.post("/cancel", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  res.json({ subscription: cancelSubscription(userId) });
});

billingRouter.post("/reactivate", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  res.json({ subscription: reactivateSubscription(userId) });
});

billingRouter.get("/credits", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  res.json({
    balance: getCreditBalance(userId),
    history: getCreditHistory(userId),
  });
});

billingRouter.post("/credits/consume", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const { amount, reason, metadata } = req.body ?? {};
  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "amount must be positive number" });
    return;
  }
  const ok = consumeCredits(userId, amount, reason || "usage", metadata);
  if (!ok) {
    res.status(402).json({ error: "insufficient credits", balance: getCreditBalance(userId) });
    return;
  }
  res.json({ balance: getCreditBalance(userId) });
});

billingRouter.get("/invoices", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  res.json({ invoices: getInvoices(userId) });
});

billingRouter.post("/portal", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const session = openPortalSession(userId);
  res.json(session);
});
