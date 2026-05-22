/**
 * Workflow run-store factory (Wave 2, Slice 2a).
 *
 * Picks the persistence backend at startup: Supabase when its env is configured,
 * otherwise the process-local in-memory store. Behaviour is identical from the
 * caller's side — both satisfy the async {@link WorkflowRunStore} interface.
 * Mirrors the memory store's factory exactly.
 */

import { createServerSupabase } from "../lib/supabase";
import { InMemoryRunStore } from "./runStore";
import { SupabaseRunStore } from "./supabaseRunStore";
import type { WorkflowRunStore } from "./types";

/** True when the Supabase service env is present (URL + secret key). */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

/**
 * Build the run store for this process: a {@link SupabaseRunStore} when Supabase
 * is configured (runs persist across restarts), else an {@link InMemoryRunStore}
 * (ephemeral — dev/test/self-host without a DB).
 */
export function createRunStore(): WorkflowRunStore {
  if (isSupabaseConfigured()) {
    try {
      return new SupabaseRunStore(createServerSupabase());
    } catch (err) {
      // Never crash startup on a client-init failure — degrade to in-memory.
      console.warn(
        `[workflows] Supabase run store init failed, using in-memory: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return new InMemoryRunStore();
    }
  }
  if (process.env.NODE_ENV === "production") {
    // Loud signal: prod without Supabase means runs are lost on restart.
    console.warn(
      "[workflows] Supabase not configured — workflow runs are in-process only and will not persist across restarts.",
    );
  }
  return new InMemoryRunStore();
}

/** Process-wide default run store. */
export const runStore: WorkflowRunStore = createRunStore();
