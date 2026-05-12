import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";
import { DEFAULT_TABULAR_MODEL, resolveModel } from "../lib/llm";
import {
  type ApiKeyStatus,
  getUserApiKeyStatus,
  hasEnvApiKey,
  normalizeApiKeyProvider,
  saveUserApiKey,
} from "../lib/userApiKeys";

export const userRouter = Router();

const MONTHLY_CREDIT_LIMIT = 999999;

export type AppearanceSettings = {
  theme?: "cream" | "light" | "dark" | "paper" | "slate";
  font?:
    | "serif-garamond"
    | "sans-inter"
    | "serif-merriweather"
    | "mono-jetbrains"
    | "system";
  density?: "comfortable" | "compact";
  fontScale?: number; // 0.85 – 1.25
};

export type FeedTopic = {
  id: string;
  label: string;
  subreddits?: string[];
  keywords?: string[];
};

type UserProfileRow = {
  display_name: string | null;
  organisation: string | null;
  message_credits_used: number;
  credits_reset_date: string;
  tier: string;
  tabular_model: string;
  appearance: AppearanceSettings | null;
  feeds: FeedTopic[] | null;
};

const PROFILE_COLUMNS =
  "display_name, organisation, message_credits_used, credits_reset_date, tier, tabular_model, appearance, feeds";

const VALID_THEMES = new Set([
  "cream",
  "light",
  "dark",
  "paper",
  "slate",
]);
const VALID_FONTS = new Set([
  "serif-garamond",
  "sans-inter",
  "serif-merriweather",
  "mono-jetbrains",
  "system",
]);
const VALID_DENSITIES = new Set(["comfortable", "compact"]);

function sanitizeAppearance(
  value: unknown,
): { ok: true; appearance: AppearanceSettings } | { ok: false; detail: string } {
  if (value === null) return { ok: true, appearance: {} };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, detail: "appearance must be an object" };
  }
  const raw = value as Record<string, unknown>;
  const out: AppearanceSettings = {};
  if ("theme" in raw && raw.theme !== undefined) {
    if (typeof raw.theme !== "string" || !VALID_THEMES.has(raw.theme)) {
      return { ok: false, detail: "Unsupported appearance.theme" };
    }
    out.theme = raw.theme as AppearanceSettings["theme"];
  }
  if ("font" in raw && raw.font !== undefined) {
    if (typeof raw.font !== "string" || !VALID_FONTS.has(raw.font)) {
      return { ok: false, detail: "Unsupported appearance.font" };
    }
    out.font = raw.font as AppearanceSettings["font"];
  }
  if ("density" in raw && raw.density !== undefined) {
    if (
      typeof raw.density !== "string" ||
      !VALID_DENSITIES.has(raw.density)
    ) {
      return { ok: false, detail: "Unsupported appearance.density" };
    }
    out.density = raw.density as AppearanceSettings["density"];
  }
  if ("fontScale" in raw && raw.fontScale !== undefined) {
    if (typeof raw.fontScale !== "number" || !Number.isFinite(raw.fontScale)) {
      return { ok: false, detail: "appearance.fontScale must be a number" };
    }
    const clamped = Math.min(1.25, Math.max(0.85, raw.fontScale));
    out.fontScale = Math.round(clamped * 100) / 100;
  }
  return { ok: true, appearance: out };
}

function serializeProfile(
  row: UserProfileRow,
  apiKeyStatus?: ApiKeyStatus,
) {
  const creditsUsed = row.message_credits_used ?? 0;
  return {
    displayName: row.display_name,
    organisation: row.organisation,
    messageCreditsUsed: creditsUsed,
    creditsResetDate: row.credits_reset_date,
    creditsRemaining: Math.max(MONTHLY_CREDIT_LIMIT - creditsUsed, 0),
    tier: row.tier || "Free",
    tabularModel: resolveModel(row.tabular_model, DEFAULT_TABULAR_MODEL),
    appearance: (row.appearance ?? {}) as AppearanceSettings,
    feeds: (row.feeds ?? []) as FeedTopic[],
    ...(apiKeyStatus ? { apiKeyStatus } : {}),
  };
}

function sanitizeFeeds(value: unknown):
  | { ok: true; feeds: FeedTopic[] }
  | { ok: false; detail: string } {
  if (value === null) return { ok: true, feeds: [] };
  if (!Array.isArray(value)) {
    return { ok: false, detail: "feeds must be an array" };
  }
  const out: FeedTopic[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, detail: "feeds entries must be objects" };
    }
    const raw = entry as Record<string, unknown>;
    if (typeof raw.id !== "string" || typeof raw.label !== "string") {
      return { ok: false, detail: "feed entry needs id + label" };
    }
    const subreddits =
      raw.subreddits === undefined
        ? []
        : Array.isArray(raw.subreddits) &&
            raw.subreddits.every(
              (s) => typeof s === "string" && s.trim().length > 0,
            )
          ? (raw.subreddits as string[]).map((s) =>
              s.trim().replace(/^r\//i, ""),
            )
          : null;
    const keywords =
      raw.keywords === undefined
        ? []
        : Array.isArray(raw.keywords) &&
            raw.keywords.every(
              (s) => typeof s === "string" && s.trim().length > 0,
            )
          ? (raw.keywords as string[]).map((s) => s.trim())
          : null;
    if (subreddits === null) {
      return { ok: false, detail: "feed.subreddits must be a string array" };
    }
    if (keywords === null) {
      return { ok: false, detail: "feed.keywords must be a string array" };
    }
    out.push({
      id: raw.id.trim(),
      label: raw.label.trim(),
      subreddits,
      keywords,
    });
  }
  return { ok: true, feeds: out.slice(0, 50) };
}

function validateProfilePayload(body: unknown):
  | {
      ok: true;
      update: {
        display_name?: string | null;
        organisation?: string | null;
        tabular_model?: string;
        appearance?: AppearanceSettings;
        updated_at: string;
      };
    }
  | { ok: false; detail: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, detail: "Expected a JSON object" };
  }

  const raw = body as Record<string, unknown>;
  const allowedFields = new Set([
    "displayName",
    "organisation",
    "tabularModel",
    "appearance",
    "feeds",
  ]);
  const invalidField = Object.keys(raw).find((key) => !allowedFields.has(key));
  if (invalidField) {
    return { ok: false, detail: `Unsupported profile field: ${invalidField}` };
  }

  const update: {
    display_name?: string | null;
    organisation?: string | null;
    tabular_model?: string;
    appearance?: AppearanceSettings;
    feeds?: FeedTopic[];
    updated_at: string;
  } = { updated_at: new Date().toISOString() };

  if ("displayName" in raw) {
    if (raw.displayName !== null && typeof raw.displayName !== "string") {
      return { ok: false, detail: "displayName must be a string or null" };
    }
    update.display_name = raw.displayName?.trim() || null;
  }

  if ("organisation" in raw) {
    if (raw.organisation !== null && typeof raw.organisation !== "string") {
      return { ok: false, detail: "organisation must be a string or null" };
    }
    update.organisation = raw.organisation?.trim() || null;
  }

  if ("tabularModel" in raw) {
    if (typeof raw.tabularModel !== "string") {
      return { ok: false, detail: "tabularModel must be a string" };
    }
    const resolved = resolveModel(raw.tabularModel, "");
    if (!resolved) {
      return { ok: false, detail: "Unsupported tabularModel" };
    }
    update.tabular_model = resolved;
  }

  if ("appearance" in raw) {
    const sanitized = sanitizeAppearance(raw.appearance);
    if (!sanitized.ok) return { ok: false, detail: sanitized.detail };
    update.appearance = sanitized.appearance;
  }

  if ("feeds" in raw) {
    const sanitized = sanitizeFeeds(raw.feeds);
    if (!sanitized.ok) return { ok: false, detail: sanitized.detail };
    update.feeds = sanitized.feeds;
  }

  return { ok: true, update };
}

async function ensureProfileRow(
  db: ReturnType<typeof createServerSupabase>,
  userId: string,
) {
  const { error } = await db
    .from("user_profiles")
    .upsert(
      { user_id: userId },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  return error;
}

async function loadProfile(
  db: ReturnType<typeof createServerSupabase>,
  userId: string,
  options: { repairMissing?: boolean } = {},
) {
  let { data, error } = await db
    .from("user_profiles")
    .select(
      PROFILE_COLUMNS,
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { data: null, error };
  if (!data) {
    if (!options.repairMissing) {
      return { data: null, error: new Error("Profile not found") };
    }

    const ensureError = await ensureProfileRow(db, userId);
    if (ensureError) return { data: null, error: ensureError };

    const created = await db
      .from("user_profiles")
      .select(
        PROFILE_COLUMNS,
      )
      .eq("user_id", userId)
      .single();
    if (created.error) return { data: null, error: created.error };
    data = created.data;
  }

  let row = data as UserProfileRow;
  if (row.credits_reset_date && new Date() > new Date(row.credits_reset_date)) {
    const creditsResetDate = new Date();
    creditsResetDate.setDate(creditsResetDate.getDate() + 30);
    const { data: resetData, error: resetError } = await db
      .from("user_profiles")
      .update({
        message_credits_used: 0,
        credits_reset_date: creditsResetDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select(
        PROFILE_COLUMNS,
      )
      .single();

    if (resetError) return { data: null, error: resetError };
    row = resetData as UserProfileRow;
  }

  return { data: serializeProfile(row), error: null };
}

// POST /user/profile
userRouter.post("/profile", requireAuth, async (_req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const error = await ensureProfileRow(db, userId);
  if (error) return void res.status(500).json({ detail: error.message });
  res.json({ ok: true });
});

// GET /user/profile
userRouter.get("/profile", requireAuth, async (_req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { data, error } = await loadProfile(db, userId, {
    repairMissing: true,
  });
  if (error) return void res.status(500).json({ detail: error.message });
  const apiKeyStatus = await getUserApiKeyStatus(userId, db);
  res.json({ ...data, apiKeyStatus });
});

// PATCH /user/profile
userRouter.patch("/profile", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const parsed = validateProfilePayload(req.body);
  if (!parsed.ok) return void res.status(400).json({ detail: parsed.detail });

  const db = createServerSupabase();
  const ensureError = await ensureProfileRow(db, userId);
  if (ensureError)
    return void res.status(500).json({ detail: ensureError.message });

  const { error: updateError } = await db
    .from("user_profiles")
    .update(parsed.update)
    .eq("user_id", userId);
  if (updateError)
    return void res.status(500).json({ detail: updateError.message });

  const { data, error } = await loadProfile(db, userId);
  if (error) return void res.status(500).json({ detail: error.message });
  const apiKeyStatus = await getUserApiKeyStatus(userId, db);
  res.json({ ...data, apiKeyStatus });
});

// GET /user/api-keys
userRouter.get("/api-keys", requireAuth, async (_req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const status = await getUserApiKeyStatus(userId, db);
  res.json(status);
});

// PUT /user/api-keys/:provider
userRouter.put("/api-keys/:provider", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const provider = normalizeApiKeyProvider(req.params.provider);
  if (!provider)
    return void res.status(400).json({ detail: "Unsupported provider" });

  const apiKey =
    typeof req.body?.api_key === "string" ? req.body.api_key : null;
  const db = createServerSupabase();
  try {
    if (hasEnvApiKey(provider)) {
      return void res.status(409).json({
        detail:
          "This provider is configured by the server environment and cannot be changed from the browser.",
      });
    }
    await saveUserApiKey(userId, provider, apiKey, db);
    const status = await getUserApiKeyStatus(userId, db);
    res.json(status);
  } catch (err) {
    console.error("[user/api-keys] save failed", {
      provider,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ detail: "Failed to save API key" });
  }
});

// DELETE /user/account
userRouter.delete("/account", requireAuth, async (_req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return void res.status(500).json({ detail: error.message });
  res.status(204).send();
});
