/**
 * Durable session store — in-memory implementation (Wave 3).
 *
 * Implements {@link SessionStore}: CRUD + per-user list, `save` as upsert-like
 * patch, and `clear` for test teardown. State lives in a process-local Map; the
 * persistence seam is the interface, so a Supabase-backed store can drop in
 * later without changing call sites.
 *
 * Future SQL (for Supabase migration when permitted):
 *
 * CREATE TABLE sessions (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   data jsonb NOT NULL DEFAULT '{}'::jsonb,
 *   created_at timestamptz NOT NULL DEFAULT now(),
 *   updated_at timestamptz NOT NULL DEFAULT now()
 * );
 * CREATE INDEX sessions_user_id_idx ON sessions (user_id);
 */

import crypto from "crypto";

import type { SessionInput, SessionState, SessionStore } from "./types";

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionState>();

  async create(input: SessionInput): Promise<SessionState> {
    const now = input.now ?? new Date().toISOString();
    const session: SessionState = {
      id: crypto.randomUUID(),
      userId: input.userId,
      data: { ...(input.data ?? {}) },
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async get(id: string): Promise<SessionState | undefined> {
    return this.sessions.get(id);
  }

  async list(userId: string): Promise<SessionState[]> {
    return [...this.sessions.values()]
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async save(id: string, data: Record<string, unknown>): Promise<SessionState | undefined> {
    const existing = this.sessions.get(id);
    if (!existing) return undefined;
    const updated: SessionState = {
      ...existing,
      data: { ...data },
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async clear(): Promise<void> {
    this.sessions.clear();
  }
}
