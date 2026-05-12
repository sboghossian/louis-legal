import { Router, Request, Response } from "express";
import { scanContract, listRules } from "../risk/_engine";

export const riskRouter = Router();

riskRouter.post("/scan", (req: Request, res: Response) => {
  const { text, jurisdiction } = req.body ?? {};
  if (typeof text !== "string" || text.length === 0) {
    res.status(400).json({ error: "text (string) required" });
    return;
  }
  if (text.length > 500000) {
    res.status(413).json({ error: "text too large (>500k chars). Truncate or split." });
    return;
  }
  const result = scanContract({ text, jurisdiction });
  res.json(result);
});

riskRouter.get("/rules", (_req: Request, res: Response) => {
  const rules = listRules();
  const grouped: Record<string, typeof rules> = {};
  for (const r of rules) {
    grouped[r.category] = grouped[r.category] || [];
    grouped[r.category].push(r);
  }
  res.json({ total: rules.length, byCategory: grouped, all: rules });
});
