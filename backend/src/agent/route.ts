/**
 * Agent-native discovery route.
 *
 * Exports an Express Router that serves:
 *   GET /.well-known/agent.json
 *
 * Mount at the app root in src/index.ts:
 *   app.use(agentCardRouter);
 *
 * The endpoint is intentionally unauthenticated — agent discovery documents
 * are designed to be publicly readable so that orchestrators can negotiate
 * capabilities before they have a token (same rationale as the MCP discovery
 * endpoints at GET /api/mcp and GET /api/mcp/tools).
 */

import { Router, Request, Response } from "express";
import { buildAgentCard } from "./card";

export const agentCardRouter = Router();

agentCardRouter.get(
  "/.well-known/agent.json",
  (req: Request, res: Response): void => {
    // Derive the external base URL from the incoming request so the card
    // stays accurate behind tunnels, reverse proxies, and CDN edge nodes.
    // express's `req.protocol` + `req.hostname` already honour the
    // `trust proxy` setting set in src/index.ts.
    const baseUrl = `${req.protocol}://${req.hostname}${
      req.hostname === "localhost" || req.hostname === "127.0.0.1"
        ? `:${(req.socket as { localPort?: number }).localPort ?? process.env.PORT ?? 3001}`
        : ""
    }`;

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=300"); // 5-min cache; stale-while-revalidate
    res.json(buildAgentCard({ baseUrl }));
  },
);
