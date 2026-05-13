/**
 * Typed event bus for Louis's public developer platform.
 *
 * Internal Louis modules publish events here (e.g. "matter.created" after a
 * Supabase insert, "chat.turn" after a successful streaming turn). The public
 * SSE webhook at GET /api/v1/events tails this bus and fans them out to
 * authenticated firm-dev tokens.
 *
 * This module is process-local on purpose — the public surface is purposely
 * thin so it can later be swapped for Redis pub/sub without changing callers.
 *
 * Usage:
 *
 *   import { emitLouisEvent, subscribe } from "../lib/events";
 *   emitLouisEvent({ type: "matter.created", userId, payload: { id, title } });
 *
 *   const sub = subscribe({ userId, onEvent: (ev) => res.write(...) });
 *   // ...later
 *   sub.unsubscribe();
 */
import { EventEmitter } from "events";
import { randomUUID } from "crypto";

export type LouisEventType =
    | "matter.created"
    | "matter.updated"
    | "document.parsed"
    | "chat.turn"
    | "routine.completed"
    | "workflow.gate.opened"
    | "skill.fired";

export interface LouisEvent {
    type: LouisEventType;
    id: string;
    occurredAt: string;
    userId: string | null;
    payload: Record<string, unknown>;
}

interface EmitInput {
    type: LouisEventType;
    userId?: string | null;
    payload?: Record<string, unknown>;
}

interface SubscribeOptions {
    userId: string | null;
    onEvent: (event: LouisEvent) => void;
}

interface Subscription {
    unsubscribe: () => void;
}

const bus = new EventEmitter();
// Lift the default 10-listener cap — every active SSE client adds a listener
// and 10 is way too low for a multi-tenant developer-platform stream.
bus.setMaxListeners(1000);

const CHANNEL = "louis.event";

export function emitLouisEvent(input: EmitInput): LouisEvent {
    const event: LouisEvent = {
        type: input.type,
        id: randomUUID(),
        occurredAt: new Date().toISOString(),
        userId: input.userId ?? null,
        payload: input.payload ?? {},
    };
    bus.emit(CHANNEL, event);
    return event;
}

export function subscribe(options: SubscribeOptions): Subscription {
    const listener = (event: LouisEvent) => {
        // Per-user fan-out: only deliver events for this principal, plus any
        // global events (userId === null) such as system-wide announcements.
        if (
            options.userId &&
            event.userId &&
            event.userId !== options.userId
        ) {
            return;
        }
        try {
            options.onEvent(event);
        } catch {
            // Swallow listener errors so one bad client can't take the bus down.
        }
    };
    bus.on(CHANNEL, listener);
    return {
        unsubscribe: () => bus.off(CHANNEL, listener),
    };
}

// Test/diagnostic helper — useful for the /api/v1/events sample stream so
// developers see traffic immediately without needing to drive real activity.
export function emitDemoHeartbeat(userId: string | null): void {
    emitLouisEvent({
        type: "chat.turn",
        userId,
        payload: {
            demo: true,
            note: "synthetic heartbeat — drives traffic so SSE clients can verify their wiring",
        },
    });
}
