/**
 * Session-store factory (Wave 3 — durable sessions).
 *
 * Picks the persistence backend at startup: Supabase when its env is
 * configured, otherwise the process-local in-memory store. Behaviour is
 * identical from the caller's side — both satisfy the async
 * {@link SessionStore} interface.
 */

import { createServerSupabase } from "../lib/supabase";
import { InMemorySessionStore } from "./store";
import { SupabaseSessionStore } from "./supabaseStore";
import type { SessionStore } from "./types";

/** True when the Supabase service env is present (URL + secret key). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/**
 * Build the session store for this process: a {@link SupabaseSessionStore}
 * when Supabase is configured (sessions persist across restarts), else an
 * {@link InMemorySessionStore} (ephemeral — dev/test/self-host without a DB).
 */
export function createSessionStore(): SessionStore {
  if (isSupabaseConfigured()) {
    try {
      return new SupabaseSessionStore(createServerSupabase());
    } catch (err) {
      // Never crash startup on a client-init failure — degrade to in-memory.
      console.warn(
        `[sessions] Supabase store init failed, using in-memory: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return new InMemorySessionStore();
    }
  }
  if (process.env.NODE_ENV === "production") {
    // Loud signal: prod without Supabase means sessions are lost on restart.
    console.warn(
      "[sessions] Supabase not configured — sessions are in-process only and will not persist across restarts.",
    );
  }
  return new InMemorySessionStore();
}

/** Process-wide default store. */
export const sessionStore: SessionStore = createSessionStore();
