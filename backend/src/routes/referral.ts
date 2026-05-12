import { Router, Request, Response } from "express";
import { getOrCreateCode, listMyCodes, listInvites, inviteByEmail, markInviteStage, Product } from "../referral/_store";

export const referralRouter = Router();

function userIdFrom(req: Request, res: Response): string {
  return (req.headers["x-user-id"] as string) || (res.locals?.userId as string) || "demo";
}

referralRouter.get("/codes", (req: Request, res: Response) => {
  res.json({ codes: listMyCodes(userIdFrom(req, res)) });
});

referralRouter.post("/codes", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const { product, displayName } = req.body ?? {};
  if (!product || !["ai", "efirm"].includes(product)) {
    res.status(400).json({ error: "product must be 'ai' or 'efirm'" });
    return;
  }
  const code = getOrCreateCode(userId, product as Product, displayName);
  res.status(201).json(code);
});

referralRouter.get("/codes/:codeId/invites", (req: Request, res: Response) => {
  res.json({ invites: listInvites(req.params.codeId) });
});

referralRouter.post("/codes/:codeId/invites", (req: Request, res: Response) => {
  const { email, name } = req.body ?? {};
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const invite = inviteByEmail(req.params.codeId, email, name);
  res.status(201).json(invite);
});

referralRouter.patch("/invites/:inviteId", (req: Request, res: Response) => {
  const { stage, reward } = req.body ?? {};
  if (!stage) { res.status(400).json({ error: "stage required" }); return; }
  const updated = markInviteStage(req.params.inviteId, stage, reward);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});
