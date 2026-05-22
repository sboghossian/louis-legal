/**
 * Wave 4 — Session checkpoint helpers.
 *
 * Thin, testable wrappers around a {@link SessionStore} that provide the three
 * opt-in entry points the chat turn and workflow engine call for resumability:
 *
 *   Chat turn:
 *     1. `checkpointStart(store, userId, initialData)` — on conversation start.
 *     2. `checkpointSave(store, id, stepData)` — after every assistant turn.
 *     3. `checkpointHydrate(store, id, userId)` — on resume (new connection,
 *        page reload, webhook retry, etc.) to validate ownership before reading.
 *
 *   Workflow engine:
 *     1. `checkpointStart` — when a new workflow run begins.
 *     2. `checkpointSave` — after each step so partial progress survives crashes.
 *     3. `checkpointHydrate` — when retrying or resuming a paused workflow.
 *
 * The store is always injected (never imported as a singleton) so every call
 * site is independently testable with an {@link InMemorySessionStore}.
 *
 * Wiring (lead's responsibility, not done here):
 *   - Chat:     `src/chat/turn.ts`    — call start/save/hydrate around turn logic.
 *   - Workflow: `src/workflow/run.ts` — call start/save/hydrate around step logic.
 */

import type { SessionState, SessionStore } from "./types";

/**
 * Create a new checkpoint session owned by `userId`.
 *
 * Always creates a fresh session — callers that need idempotency should store
 * the returned `id` and use {@link checkpointHydrate} on subsequent requests
 * rather than calling `checkpointStart` again.
 *
 * @param store  - The active session store (injected for testability).
 * @param userId - The owner of this checkpoint session.
 * @param data   - Optional initial payload (chat context, workflow metadata, …).
 * @returns The newly created {@link SessionState}.
 */
export async function checkpointStart(
  store: SessionStore,
  userId: string,
  data?: Record<string, unknown>,
): Promise<SessionState> {
  return store.create({ userId, data: data ?? {} });
}

/**
 * Shallow-merge `data` into the existing session and persist it.
 *
 * Existing keys not present in `data` are preserved (merge, not replace).
 * If the session does not exist the store's `save` returns `undefined` and
 * this function propagates that — callers should treat it as a no-op signal.
 *
 * @param store - The active session store.
 * @param id    - UUID of the session to patch.
 * @param data  - Keys to add or overwrite in the existing payload.
 * @returns The updated {@link SessionState}, or `undefined` if not found.
 */
export async function checkpointSave(
  store: SessionStore,
  id: string,
  data: Record<string, unknown>,
): Promise<SessionState | undefined> {
  const existing = await store.get(id);
  if (!existing) return undefined;
  const merged: Record<string, unknown> = { ...existing.data, ...data };
  return store.save(id, merged);
}

/**
 * Owner-scoped session retrieval for safe resumption.
 *
 * Returns the session only when it exists AND `userId` matches the stored
 * owner, enforcing per-user isolation at the checkpoint layer. Returns
 * `undefined` for unknown ids or ownership mismatches — callers should treat
 * both cases identically (start a fresh session) to avoid leaking existence.
 *
 * @param store  - The active session store.
 * @param id     - UUID of the session to resume.
 * @param userId - The requesting user — must match `session.userId`.
 * @returns The {@link SessionState} if found and owned, otherwise `undefined`.
 */
export async function checkpointHydrate(
  store: SessionStore,
  id: string,
  userId: string,
): Promise<SessionState | undefined> {
  const session = await store.get(id);
  if (!session) return undefined;
  if (session.userId !== userId) return undefined;
  return session;
}
