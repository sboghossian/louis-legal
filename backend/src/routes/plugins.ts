/**
 * First-party plug-in marketplace.
 *
 * Curated catalog of "official" Louis plug-ins shipped + maintained in-house.
 * The catalog is in-memory (these are real GitHub-hosted plug-ins, not
 * user-uploaded), so there's no Supabase schema yet. When third-party
 * plug-ins land, swap this for a `plugins` table with a vetting workflow.
 *
 * Exposed at /api/v1/plugins (read-only) so a firm-dev tool can list the
 * catalog with the same Bearer pk_louis_… auth as the rest of the public API.
 */

import { Router, Request, Response } from "express";
import { requireApiToken } from "./public-api";

export const pluginsRouter = Router();

export interface PluginManifest {
    id: string;
    name: string;
    description: string;
    icon: string;
    install_url: string;
    repo_url: string;
    category: "communication" | "productivity" | "automation";
    author: string;
    version: string;
    verified: boolean;
}

const CATALOG: PluginManifest[] = [
    {
        id: "outlook-deadline-extractor",
        name: "Outlook deadline-extractor",
        description:
            "Watches a shared Outlook inbox for incoming email + attachments, pulls statutory deadlines out of the body and exhibits, and writes them back into Louis as Matter due dates.",
        icon: "Mail",
        install_url:
            "https://github.com/sboghossian/louis-plugins/tree/main/outlook-deadline-extractor#install",
        repo_url:
            "https://github.com/sboghossian/louis-plugins/tree/main/outlook-deadline-extractor",
        category: "productivity",
        author: "Louis team",
        version: "0.1.0",
        verified: true,
    },
    {
        id: "slack-chat-mirror",
        name: "Slack chat-mirror",
        description:
            "Mirrors a Louis chat into a Slack channel in real time so the rest of the deal team sees the AI's findings as they happen — no copy-paste, no out-of-band screenshots.",
        icon: "MessageSquare",
        install_url:
            "https://github.com/sboghossian/louis-plugins/tree/main/slack-chat-mirror#install",
        repo_url:
            "https://github.com/sboghossian/louis-plugins/tree/main/slack-chat-mirror",
        category: "communication",
        author: "Louis team",
        version: "0.1.0",
        verified: true,
    },
    {
        id: "webhook-to-zapier",
        name: "Webhook to Zapier",
        description:
            "Bridges the /api/v1/events SSE stream to Zapier (or Make / n8n) over plain webhooks. Drop-in glue for firms that already automate everything in Zapier.",
        icon: "Zap",
        install_url:
            "https://github.com/sboghossian/louis-plugins/tree/main/webhook-to-zapier#install",
        repo_url:
            "https://github.com/sboghossian/louis-plugins/tree/main/webhook-to-zapier",
        category: "automation",
        author: "Louis team",
        version: "0.1.0",
        verified: true,
    },
];

// Public list endpoint — used by both the marketplace UI (no auth) and
// dev-platform CLI tools (auth via API token). We deliberately make it
// available unauthenticated so the marketplace page works for visitors
// previewing Louis without an account.
pluginsRouter.get("/", (_req: Request, res: Response) => {
    res.json({
        data: { plugins: CATALOG },
        error: null,
        meta: { count: CATALOG.length, version: "v1" },
    });
});

pluginsRouter.get("/:id", (req: Request, res: Response) => {
    const plugin = CATALOG.find((p) => p.id === req.params.id);
    if (!plugin) {
        res.status(404).json({
            data: null,
            error: { code: "not_found", message: "Plugin not found" },
            meta: { version: "v1" },
        });
        return;
    }
    res.json({
        data: plugin,
        error: null,
        meta: { version: "v1" },
    });
});

// Authenticated install hook — stub for now. In a real install flow this
// would call into /api/integrations/:id/connect, push a webhook URL onto the
// caller's account, or scaffold the plug-in's storage tables.
pluginsRouter.post(
    "/:id/install",
    requireApiToken,
    (req: Request, res: Response) => {
        const plugin = CATALOG.find((p) => p.id === req.params.id);
        if (!plugin) {
            res.status(404).json({
                data: null,
                error: { code: "not_found", message: "Plugin not found" },
                meta: { version: "v1" },
            });
            return;
        }
        res.json({
            data: {
                installed: true,
                plugin_id: plugin.id,
                next_steps: [
                    "Follow the README at " + plugin.repo_url,
                    "Use POST /api/v1/tokens to mint an API token if you don't have one",
                    "Point the plug-in at /api/v1/events to start receiving Louis events",
                ],
            },
            error: null,
            meta: { version: "v1" },
        });
    },
);
