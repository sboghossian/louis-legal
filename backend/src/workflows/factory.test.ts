/**
 * Factory tests (Wave 2, Slice 2a — persistence): picks the right backend by
 * env, and stays in-memory (safe) when Supabase is not configured. Mirrors the
 * memory factory test.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createRunStore, isSupabaseConfigured } from "./factory";
import { InMemoryRunStore } from "./runStore";
import { SupabaseRunStore } from "./supabaseRunStore";

const ORIG_URL = process.env.SUPABASE_URL;
const ORIG_KEY = process.env.SUPABASE_SECRET_KEY;

describe("workflow run store factory", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
  });
  afterEach(() => {
    if (ORIG_URL === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = ORIG_URL;
    if (ORIG_KEY === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = ORIG_KEY;
  });

  it("falls back to in-memory when Supabase env is unset", () => {
    expect(isSupabaseConfigured()).toBe(false);
    expect(createRunStore()).toBeInstanceOf(InMemoryRunStore);
  });

  it("uses Supabase when both env vars are present", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    expect(isSupabaseConfigured()).toBe(true);
    expect(createRunStore()).toBeInstanceOf(SupabaseRunStore);
  });

  it("stays in-memory if only one env var is set", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    expect(isSupabaseConfigured()).toBe(false);
    expect(createRunStore()).toBeInstanceOf(InMemoryRunStore);
  });
});
