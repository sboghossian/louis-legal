/**
 * Public types for the durable session store (Wave 3 — hydrate-from-archive).
 *
 * A session is a resumable unit of work bound to a user. `data` is an opaque
 * JSON blob that callers (chat pipeline, workflow engine, etc.) shape as needed.
 * The store is deliberately self-contained: no imports from other app modules,
 * no network, no LLM — so it can be unit-tested in isolation and backed by
 * Supabase without touching call sites.
 */

/** Minimal shape of a persisted session. */
export interface SessionState {
  /** UUID, assigned by the store on creation. */
  id: string;
  /** Owner — every read is user-scoped. */
  userId: string;
  /** Opaque payload: chat history, workflow step, draft content, etc. */
  data: Record<string, unknown>;
  /** ISO 8601 timestamp of creation. */
  createdAt: string;
  /** ISO 8601 timestamp of the last `save()` (or creation if never patched). */
  updatedAt: string;
}

/** Input to {@link SessionStore.create}. Defaults are filled by the store. */
export interface SessionInput {
  /** Owner of this session. Required — the store is per-user isolated. */
  userId: string;
  /** Optional initial payload. Defaults to `{}`. */
  data?: Record<string, unknown>;
  /** ISO timestamp override for deterministic tests. Defaults to now. */
  now?: string;
}

/**
 * Persistence-agnostic session store. Async so the same interface backs both
 * the in-memory implementation ({@link InMemorySessionStore}) and a
 * Supabase-backed one ({@link SupabaseSessionStore}) without changing call sites.
 */
export interface SessionStore {
  /** Create a new session; returns the materialised state. */
  create(input: SessionInput): Promise<SessionState>;
  /** Read one session by id. Returns `undefined` if not found. */
  get(id: string): Promise<SessionState | undefined>;
  /** All sessions owned by `userId`, newest-first. */
  list(userId: string): Promise<SessionState[]>;
  /**
   * Patch the session's data payload and bump `updatedAt`. Creates the session
   * if it does not exist (upsert-like contract for restore flows).
   * Returns the updated state, or `undefined` when the id is unknown and no
   * row was created (in-memory implementation always returns a value on save).
   */
  save(id: string, data: Record<string, unknown>): Promise<SessionState | undefined>;
  /** Hard-delete a session. No-op if not found. */
  delete(id: string): Promise<void>;
  /**
   * Drop all sessions (test/reset helper).
   * Blocked in production — see {@link SupabaseSessionStore.clear}.
   */
  clear(): Promise<void>;
}
