import { Router, Request, Response } from "express";
import {
  INTEGRATION_CATALOG, connectIntegration, disconnectIntegration,
  listUserIntegrations, getUserIntegration,
} from "../integrations/_store";

export const integrationsRouter = Router();

function userIdFrom(req: Request, res: Response): string {
  return (req.headers["x-user-id"] as string) || (res.locals?.userId as string) || "demo";
}

integrationsRouter.get("/catalog", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const user = listUserIntegrations(userId);
  const enriched = INTEGRATION_CATALOG.map(c => {
    const ui = user.find(u => u.integrationId === c.id);
    return {
      ...c,
      status: ui?.status || c.defaultStatus || "disconnected",
      connectedAt: ui?.connectedAt,
      lastUsedAt: ui?.lastUsedAt,
      config: ui?.config || {},
    };
  });
  const byCategory: Record<string, typeof enriched> = {};
  for (const e of enriched) {
    (byCategory[e.category] ||= []).push(e);
  }
  res.json({ catalog: enriched, byCategory });
});

integrationsRouter.get("/me", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  res.json({ integrations: listUserIntegrations(userId) });
});

integrationsRouter.post("/:integrationId/connect", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const integration = INTEGRATION_CATALOG.find(c => c.id === req.params.integrationId);
  if (!integration) { res.status(404).json({ error: "Unknown integration" }); return; }
  const config = req.body?.config ?? {};
  const updated = connectIntegration(userId, req.params.integrationId, config);
  res.status(201).json(updated);
});

integrationsRouter.post("/:integrationId/disconnect", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const updated = disconnectIntegration(userId, req.params.integrationId);
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

integrationsRouter.get("/:integrationId", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const catalog = INTEGRATION_CATALOG.find(c => c.id === req.params.integrationId);
  if (!catalog) { res.status(404).json({ error: "Unknown integration" }); return; }
  const ui = getUserIntegration(userId, req.params.integrationId);
  res.json({
    ...catalog,
    status: ui?.status || catalog.defaultStatus || "disconnected",
    connectedAt: ui?.connectedAt,
    lastUsedAt: ui?.lastUsedAt,
    config: ui?.config || {},
  });
});
