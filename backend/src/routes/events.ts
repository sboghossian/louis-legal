/**
 * Webhooks-as-SSE — `/api/v1/events`.
 *
 * Long-lived Server-Sent-Events stream that emits typed Louis events for the
 * authenticated principal. Webhooks-style, but inverted: instead of Louis
 * POSTing to your URL, your service holds open a GET to ours. That removes
 * the need to expose a public ingress on the firm side (huge win for
 * regulated firms) while keeping the same fan-out semantics.
 *
 * Event shape (line-delimited SSE):
 *
 *   event: matter.created
 *   data: {"type":"matter.created","id":"…","occurredAt":"…","payload":{…}}
 *
 * Heartbeats fire every 15s so reverse proxies (nginx, Cloudflare) don't
 * drop the connection. The browser EventSource auto-reconnects on its own.
 */

import { Router, Request, Response } from "express";
import { requireApiToken } from "./public-api";
import { subscribe, type LouisEvent } from "../lib/events";

export const eventsRouter = Router();

const HEARTBEAT_MS = 15_000;

eventsRouter.get("/", requireApiToken, (req: Request, res: Response) => {
    const userId = res.locals.userId as string;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Opening preamble — gives the client an immediate proof-of-life and a
    // copy of the request_id so they can correlate logs.
    const openingMeta = {
        userId,
        startedAt: new Date().toISOString(),
        request_id: res.locals.requestId,
        note: "Louis SSE event stream. Heartbeat every 15s. Reconnect on EventSource error.",
    };
    res.write(`event: open\n`);
    res.write(`data: ${JSON.stringify(openingMeta)}\n\n`);

    const sub = subscribe({
        userId,
        onEvent: (event: LouisEvent) => {
            res.write(`event: ${event.type}\n`);
            res.write(`id: ${event.id}\n`);
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        },
    });

    const heartbeat = setInterval(() => {
        // Comments (lines starting with `:`) are valid SSE no-ops — they
        // keep the socket warm without showing up in the client's
        // EventSource onmessage handler.
        res.write(`: heartbeat ${Date.now()}\n\n`);
    }, HEARTBEAT_MS);

    const cleanup = () => {
        clearInterval(heartbeat);
        sub.unsubscribe();
    };
    req.on("close", cleanup);
    req.on("aborted", cleanup);
    res.on("close", cleanup);
});

// Optional helper: list the event types so dev tools can autocomplete filters.
eventsRouter.get("/types", requireApiToken, (_req: Request, res: Response) => {
    res.json({
        data: {
            types: [
                "matter.created",
                "matter.updated",
                "document.parsed",
                "chat.turn",
                "routine.completed",
                "workflow.gate.opened",
                "skill.fired",
            ],
        },
        error: null,
        meta: { version: "v1" },
    });
});
