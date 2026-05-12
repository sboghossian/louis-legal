import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";

export const customizeRouter = Router();

interface SettingRow {
  key: string;
  enabled: boolean;
  updated_at: string;
}

/**
 * GET /api/customize
 * Returns: { settings: { [key: string]: boolean } }
 */
customizeRouter.get("/", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { data, error } = await db
    .from("customize_settings")
    .select("key, enabled, updated_at")
    .eq("user_id", userId);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const settings: Record<string, boolean> = {};
  (data as SettingRow[] ?? []).forEach((row) => {
    settings[row.key] = row.enabled;
  });
  res.json({ settings });
});

/**
 * POST /api/customize
 * Body: { settings: { [key: string]: boolean } }
 * Upserts all provided keys.
 */
customizeRouter.post("/", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const body = req.body as { settings?: Record<string, boolean> };
  if (!body.settings || typeof body.settings !== "object") {
    res.status(400).json({ error: "settings_required" });
    return;
  }
  const rows = Object.entries(body.settings).map(([key, enabled]) => ({
    user_id: userId,
    key,
    enabled: !!enabled,
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) {
    res.json({ saved: 0 });
    return;
  }
  const db = createServerSupabase();
  const { error } = await db
    .from("customize_settings")
    .upsert(rows, { onConflict: "user_id,key" });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ saved: rows.length });
});

/**
 * POST /api/customize/:key
 * Body: { enabled: boolean }
 */
customizeRouter.post("/:key", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const key = req.params.key;
  const body = req.body as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    res.status(400).json({ error: "enabled_required" });
    return;
  }
  const db = createServerSupabase();
  const { error } = await db
    .from("customize_settings")
    .upsert(
      { user_id: userId, key, enabled: body.enabled, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    );
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ key, enabled: body.enabled });
});
