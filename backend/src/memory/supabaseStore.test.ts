/**
 * Pure mapper tests for the Supabase memory store (Processor v2 — persistence).
 * No DB: covers the row↔entry mapping only. Live I/O is exercised against the
 * real table, not in unit tests (no DB in CI).
 */
import { describe, it, expect } from "vitest";

import { rowToEntry, entryToRow, type MemoryRow } from "./supabaseStore";
import type { MemoryEntry } from "./types";

const T0 = "2026-05-01T00:00:00.000Z";

describe("rowToEntry / entryToRow", () => {
  it("round-trips a fully-populated entry", () => {
    const entry: MemoryEntry = {
      id: "id-1",
      userId: "u1",
      tier: "precedent",
      content: "indemnity carve-out",
      tags: { practiceArea: "employment", jurisdiction: "UAE", docType: "contract" },
      scopeId: "client-9",
      helpfulCount: 3,
      unhelpfulCount: 1,
      usageCount: 5,
      status: "confirmed",
      createdAt: T0,
      updatedAt: T0,
      lastUsedAt: T0,
    };
    expect(rowToEntry(entryToRow(entry))).toEqual(entry);
  });

  it("maps absent tags/scope/status to null columns and back to absent", () => {
    const entry: MemoryEntry = {
      id: "id-2",
      userId: "u1",
      tier: "session",
      content: "prefers UAE law",
      tags: {},
      helpfulCount: 0,
      unhelpfulCount: 0,
      usageCount: 0,
      createdAt: T0,
      updatedAt: T0,
      lastUsedAt: T0,
    };
    const row = entryToRow(entry);
    expect(row.scope_id).toBeNull();
    expect(row.practice_area).toBeNull();
    expect(row.jurisdiction).toBeNull();
    expect(row.doc_type).toBeNull();
    expect(row.status).toBeNull();

    const back = rowToEntry(row);
    expect(back).toEqual(entry);
    expect(back.scopeId).toBeUndefined();
    expect(back.status).toBeUndefined();
    expect(back.tags).toEqual({});
  });

  it("rowToEntry omits null tag columns (no undefined-valued keys)", () => {
    const row: MemoryRow = {
      id: "x",
      user_id: "u",
      tier: "matter",
      content: "c",
      scope_id: null,
      practice_area: "corporate",
      jurisdiction: null,
      doc_type: null,
      helpful_count: 0,
      unhelpful_count: 0,
      usage_count: 0,
      status: null,
      created_at: T0,
      updated_at: T0,
      last_used_at: T0,
    };
    const e = rowToEntry(row);
    expect(e.tags).toEqual({ practiceArea: "corporate" });
    expect("jurisdiction" in e.tags).toBe(false);
    expect("docType" in e.tags).toBe(false);
  });
});
