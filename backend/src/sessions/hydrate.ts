/**
 * hydrate-from-archive entry point (Wave 3).
 *
 * `hydrate` is the public interface for resuming a session. Today it is
 * equivalent to a direct store lookup (`store.get(id)`). This function is the
 * intended extension point for archive tiering: when a session is not found in
 * the hot `sessions` table, a future implementation can fall back to a cold
 * archive (e.g. a separate `sessions_archive` table, S3/R2 object, or vector
 * summary) before returning `undefined`.
 *
 * Follow-up work (archive tiering):
 *   1. After N days of inactivity, a background job moves sessions rows to
 *      `sessions_archive` (or compresses them to S3/R2).
 *   2. `hydrate` checks the hot store first; on a miss, it queries the archive
 *      and, on a hit, restores the row to the hot store (lazy re-hydration).
 *   3. Add a `hydratedFrom: "hot" | "archive"` field to the return so callers
 *      can decide whether to re-warm embeddings, etc.
 */

import type { SessionState, SessionStore } from "./types";

/**
 * Retrieve a session by id, ready for resumption.
 *
 * @param store - The active session store (inject for testability).
 * @param id    - The session UUID to resume.
 * @returns The session state, or `undefined` if not found.
 */
export async function hydrate(
  store: SessionStore,
  id: string,
): Promise<SessionState | undefined> {
  return store.get(id);
}
