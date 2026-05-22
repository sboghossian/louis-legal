/**
 * Public API barrel for the durable session store (Wave 3 — hydrate-from-archive).
 *
 * Wiring guide for the lead:
 *   - Chat pipeline:  import { sessionStore, hydrate } from "@/sessions"
 *                     On turn start: const s = await hydrate(sessionStore, sessionId);
 *                     On turn end:   await sessionStore.save(s.id, updatedData);
 *   - Workflow engine: same pattern — create once, hydrate on resume, save after
 *                      each step so partial progress survives crashes.
 *   - Apply the DB schema: run `backend/migrations/2026-05-22-sessions.sql`
 *     against your Supabase project before enabling SUPABASE_URL + SUPABASE_SECRET_KEY.
 */
export { InMemorySessionStore } from "./store";
export { SupabaseSessionStore, rowToSession, sessionToRow } from "./supabaseStore";
export type { SessionRow } from "./supabaseStore";
export { sessionStore, createSessionStore, isSupabaseConfigured } from "./factory";
export { hydrate } from "./hydrate";
export type { SessionState, SessionInput, SessionStore } from "./types";
