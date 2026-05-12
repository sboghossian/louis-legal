import { Router, Request, Response } from "express";
import { getOrCreateTeam, listMembers, inviteMember, updateMember, removeMember, acceptInvite, ROLE_DESCRIPTIONS, Role } from "../team/_store";

export const teamRouter = Router();

function userIdFrom(req: Request, res: Response): string {
  return (req.headers["x-user-id"] as string) || (res.locals?.userId as string) || "demo";
}

teamRouter.get("/me", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const team = getOrCreateTeam(userId);
  const members = listMembers(team.id);
  res.json({ team, members, roles: ROLE_DESCRIPTIONS });
});

teamRouter.post("/invite", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const { email, name, role } = req.body ?? {};
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const team = getOrCreateTeam(userId);
  const m = inviteMember(team.id, email, (role as Role) || "member", userId, name);
  res.status(201).json(m);
});

teamRouter.post("/members/:memberId/accept", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const m = acceptInvite(req.params.memberId, userId);
  if (!m) { res.status(404).json({ error: "Not found" }); return; }
  res.json(m);
});

teamRouter.patch("/members/:memberId", (req: Request, res: Response) => {
  const m = updateMember(req.params.memberId, req.body ?? {});
  if (!m) { res.status(404).json({ error: "Not found" }); return; }
  res.json(m);
});

teamRouter.delete("/members/:memberId", (req: Request, res: Response) => {
  const ok = removeMember(req.params.memberId);
  if (!ok) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});
