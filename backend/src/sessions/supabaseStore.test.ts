/**
 * Pure mapper tests for the Supabase session store (Wave 3 — persistence).
 * No DB: covers the row↔state mapping only. Live I/O is exercised against the
 * real table, not in unit tests (no DB in CI).
 */
import { describe, it, expect } from "vitest";

import { rowToSession, sessionToRow, type SessionRow } from "./supabaseStore";
import type { SessionState } from "./types";

const T0 = "2026-05-22T00:00:00.000Z";

describe("rowToSession / sessionToRow", () => {
  it("round-trips a fully-populated session", () => {
    const session: SessionState = {
      id: "id-1",
      userId: "u1",
      data: { step: 2, context: { key: "value" } },
      createdAt: T0,
      updatedAt: T0,
    };
    expect(rowToSession(sessionToRow(session))).toEqual(session);
  });

  it("round-trips a session with an empty data object", () => {
    const session: SessionState = {
      id: "id-2",
      userId: "u2",
      data: {},
      createdAt: T0,
      updatedAt: T0,
    };
    const row = sessionToRow(session);
    expect(row.data).toEqual({});
    expect(rowToSession(row)).toEqual(session);
  });

  it("sessionToRow maps domain fields to snake_case columns", () => {
    const session: SessionState = {
      id: "id-3",
      userId: "u3",
      data: { draft: "hello" },
      createdAt: T0,
      updatedAt: T0,
    };
    const row = sessionToRow(session);
    expect(row.id).toBe("id-3");
    expect(row.user_id).toBe("u3");
    expect(row.data).toEqual({ draft: "hello" });
    expect(row.created_at).toBe(T0);
    expect(row.updated_at).toBe(T0);
  });

  it("rowToSession maps snake_case columns to camelCase fields", () => {
    const row: SessionRow = {
      id: "id-4",
      user_id: "u4",
      data: { status: "active" },
      created_at: T0,
      updated_at: T0,
    };
    const session = rowToSession(row);
    expect(session.id).toBe("id-4");
    expect(session.userId).toBe("u4");
    expect(session.data).toEqual({ status: "active" });
    expect(session.createdAt).toBe(T0);
    expect(session.updatedAt).toBe(T0);
  });

  it("rowToSession defaults absent/null data to an empty object", () => {
    // Supabase might return null for a jsonb column in edge cases
    const row: SessionRow = {
      id: "id-5",
      user_id: "u5",
      data: null as unknown as Record<string, unknown>,
      created_at: T0,
      updated_at: T0,
    };
    const session = rowToSession(row);
    expect(session.data).toEqual({});
  });
});
