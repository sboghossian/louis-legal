/**
 * Memory-store factory (Processor v2 — persistent memory).
 *
 * Picks the persistence backend at startup: Supabase when its env is configured,
 * otherwise the process-local in-memory store. Behaviour is identical from the
 * caller's side — both satisfy the async {@link MemoryStore} interface.
 */

import { createServerSupabase } from "../lib/supabase";
import { InMemoryMemoryStore } from "./store";
import { SupabaseMemoryStore } from "./supabaseStore";
import type { MemoryStore } from "./types";

/** True when the Supabase service env is present (URL + secret key). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/**
 * Build the memory store for this process: a {@link SupabaseMemoryStore} when
 * Supabase is configured (memory persists across restarts), else an
 * {@link InMemoryMemoryStore} (ephemeral — dev/test/self-host without a DB).
 */
export function createMemoryStore(): MemoryStore {
  if (isSupabaseConfigured()) {
    try {
      return new SupabaseMemoryStore(createServerSupabase());
    } catch (err) {
      // Never crash startup on a client-init failure — degrade to in-memory.
      console.warn(
        `[memory] Supabase store init failed, using in-memory: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return new InMemoryMemoryStore();
    }
  }
  if (process.env.NODE_ENV === "production") {
    // Loud signal: prod without Supabase means memory is lost on restart.
    console.warn(
      "[memory] Supabase not configured — memory is in-process only and will not persist across restarts.",
    );
  }
  return new InMemoryMemoryStore();
}

/** Process-wide default store. */
export const memoryStore: MemoryStore = createMemoryStore();
