/**
 * Supabase-backed {@link SessionStore} (Wave 3 — durable sessions).
 *
 * Same contract as {@link InMemorySessionStore}, but rows live in the
 * `sessions` table so session state survives restarts and is shared across
 * instances. Mappers (`rowToSession` / `sessionToRow`) are pure functions so
 * they can be tested without a DB connection.
 *
 * Migration: `backend/migrations/2026-05-22-sessions.sql`.
 */

import crypto from "crypto";

import { createServerSupabase } from "../lib/supabase";
import type { SessionInput, SessionState, SessionStore } from "./types";

const TABLE = "sessions";

/** Database row shape for `sessions` (snake_case columns). */
export interface SessionRow {
  id: string;
  user_id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Pure: DB row → domain state. */
export function rowToSession(row: SessionRow): SessionState {
  return {
    id: row.id,
    userId: row.user_id,
    data: row.data ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Pure: domain state → DB row. */
export function sessionToRow(session: SessionState): SessionRow {
  return {
    id: session.id,
    user_id: session.userId,
    data: session.data,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

export class SupabaseSessionStore implements SessionStore {
  constructor(private readonly db: ReturnType<typeof createServerSupabase>) {}

  async create(input: SessionInput): Promise<SessionState> {
    const now = input.now ?? new Date().toISOString();
    const session: SessionState = {
      id: crypto.randomUUID(),
      userId: input.userId,
      data: { ...(input.data ?? {}) },
      createdAt: now,
      updatedAt: now,
    };
    const { error } = await this.db.from(TABLE).insert(sessionToRow(session));
    if (error) throw new Error(`session create failed: ${error.message}`);
    return session;
  }

  async get(id: string): Promise<SessionState | undefined> {
    const { data, error } = await this.db.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`session get failed: ${error.message}`);
    return data ? rowToSession(data as SessionRow) : undefined;
  }

  async list(userId: string): Promise<SessionState[]> {
    const { data, error } = await this.db
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`session list failed: ${error.message}`);
    return ((data ?? []) as SessionRow[]).map(rowToSession);
  }

  async save(id: string, data: Record<string, unknown>): Promise<SessionState | undefined> {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const updated: SessionState = {
      ...existing,
      data: { ...data },
      updatedAt: new Date().toISOString(),
    };
    const row = sessionToRow(updated);
    const { error } = await this.db.from(TABLE).update(row).eq("id", id);
    if (error) throw new Error(`session save failed: ${error.message}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from(TABLE).delete().eq("id", id);
    if (error) throw new Error(`session delete failed: ${error.message}`);
  }

  async clear(): Promise<void> {
    // Destructive: deletes EVERY session row (all users). Test/reset only — never
    // wire this to a user action. Hard-blocked outside tests so a misrouted call
    // can't wipe production sessions.
    if (process.env.NODE_ENV === "production") {
      throw new Error("SupabaseSessionStore.clear() is disabled in production");
    }
    const { error } = await this.db.from(TABLE).delete().neq("id", "");
    if (error) throw new Error(`session clear failed: ${error.message}`);
  }
}
