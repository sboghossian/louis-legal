/**
 * Unified BYO-API-key store — encrypted-at-rest on Supabase.
 *
 * This is the single source of truth for every provider key the user stores.
 * It replaces the in-memory `backend/src/apiKeys/_store.ts` (which lost
 * everything on restart) and extends the existing `lib/userApiKeys.ts`
 * three-provider helper to the full 14-provider catalog (decision #7,
 * #22).
 *
 * The table (`public.user_api_keys`) was originally constrained to
 * claude/gemini/openai; the 2026-05-13 migration drops that check and
 * adds `label`, `is_default`, `last_used_at` so we can store multiple keys
 * per (user, provider) and remember which one is the working default.
 *
 * Chat reads (lib/userApiKeys.ts → getUserApiKeys / getUserApiKeyStatus)
 * already key on (user_id, provider) and pick the default row, so this
 * store stays compatible.
 */

import crypto from "crypto";
import { createServerSupabase } from "./supabase";

type Db = ReturnType<typeof createServerSupabase>;

// Canonical DB-side provider codes. The chat path (lib/userApiKeys.ts)
// keys on `claude` / `gemini` / `openai`, so we use those as the stored
// names. The UI catalog (routes/apiKeys.ts) maps `anthropic` → `claude`
// and `google` → `gemini` via aliasProvider() so users don't have to know
// the internal name.
export const ALL_PROVIDERS = [
  "claude",
  "openai",
  "gemini",
  "voyage",
  "cohere",
  "groq",
  "deepseek",
  "mistral",
  "openrouter",
  "cerebras",
  "perplexity",
  "tavily",
  "firecrawl",
  "huggingface",
] as const;

export type Provider = (typeof ALL_PROVIDERS)[number];

// User-friendly aliases accepted from the UI. Keeping these out of the
// canonical Provider union means call sites pick a single id even if the
// frontend later switches naming.
const PROVIDER_ALIASES: Record<string, Provider> = {
  anthropic: "claude",
  google: "gemini",
};

export function aliasProvider(value: string): Provider | null {
  if (PROVIDER_ALIASES[value]) return PROVIDER_ALIASES[value];
  if ((ALL_PROVIDERS as readonly string[]).includes(value)) return value as Provider;
  return null;
}

export function isProvider(value: string): value is Provider {
  return (ALL_PROVIDERS as readonly string[]).includes(value);
}

export interface ApiKey {
  id: string;
  userId: string;
  provider: Provider;
  label?: string;
  keyMasked: string;
  keyLast4: string;
  isDefault: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

interface KeyRow {
  id: string;
  user_id: string;
  provider: string;
  label: string | null;
  encrypted_key: string;
  iv: string;
  auth_tag: string;
  is_default: boolean;
  created_at: string;
  last_used_at: string | null;
}

function encryptionKey(): Buffer {
  const secret =
    process.env.USER_API_KEYS_ENCRYPTION_SECRET ||
    process.env.API_KEYS_ENCRYPTION_SECRET ||
    process.env.SUPABASE_SECRET_KEY;
  if (!secret) {
    throw new Error("API key encryption secret is not configured");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(value: string): { encrypted_key: string; iv: string; auth_tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    encrypted_key: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    auth_tag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(row: Pick<KeyRow, "encrypted_key" | "iv" | "auth_tag">): string | null {
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(row.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(row.encrypted_key, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("[user-api-keys-extended] failed to decrypt stored key", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function mask(plaintext: string): { masked: string; last4: string } {
  if (plaintext.length <= 8) {
    return { masked: "•".repeat(plaintext.length), last4: plaintext.slice(-4) };
  }
  const last4 = plaintext.slice(-4);
  const head = plaintext.slice(0, 4);
  return { masked: `${head}${"•".repeat(Math.max(8, plaintext.length - 8))}${last4}`, last4 };
}

function toPublic(row: KeyRow): ApiKey | null {
  if (!isProvider(row.provider)) return null;
  const plaintext = decrypt(row);
  if (!plaintext) return null;
  const { masked, last4 } = mask(plaintext);
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    label: row.label ?? undefined,
    keyMasked: masked,
    keyLast4: last4,
    isDefault: row.is_default,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at ?? undefined,
  };
}

export async function listKeys(
  userId: string,
  provider?: Provider,
  db: Db = createServerSupabase(),
): Promise<ApiKey[]> {
  let query = db
    .from("user_api_keys")
    .select("id, user_id, provider, label, encrypted_key, iv, auth_tag, is_default, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (provider) {
    query = query.eq("provider", provider);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as KeyRow[];
  return rows
    .map(toPublic)
    .filter((r): r is ApiKey => r !== null);
}

export async function addKey(
  userId: string,
  provider: Provider,
  key: string,
  label?: string,
  makeDefault?: boolean,
  db: Db = createServerSupabase(),
): Promise<ApiKey> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("key is empty");

  // If the user has no keys for this provider yet, force-default this one.
  // Otherwise honor the explicit flag.
  const { count } = await db
    .from("user_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("provider", provider);
  const isDefault = !!makeDefault || (count ?? 0) === 0;

  // Clear existing default if we're claiming the slot, since the partial
  // unique index only allows one default per (user, provider).
  if (isDefault) {
    await db
      .from("user_api_keys")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("is_default", true);
  }

  const enc = encrypt(trimmed);
  const { data, error } = await db
    .from("user_api_keys")
    .insert({
      user_id: userId,
      provider,
      label: label?.trim() || null,
      is_default: isDefault,
      ...enc,
      updated_at: new Date().toISOString(),
    })
    .select("id, user_id, provider, label, encrypted_key, iv, auth_tag, is_default, created_at, last_used_at")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "failed to persist key");
  }
  const pub = toPublic(data as KeyRow);
  if (!pub) throw new Error("failed to decode persisted key");
  return pub;
}

export async function deleteKey(
  id: string,
  userId: string,
  db: Db = createServerSupabase(),
): Promise<boolean> {
  // Look up the row first so we can rebalance the default afterwards.
  const { data: row } = await db
    .from("user_api_keys")
    .select("id, user_id, provider, is_default")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return false;

  const { error } = await db
    .from("user_api_keys")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;

  // If we removed the default, promote the most-recent remaining row for
  // that provider — keeps the chat path working without forcing the user
  // back to the settings page.
  if (row.is_default) {
    const { data: next } = await db
      .from("user_api_keys")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", row.provider)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (next?.id) {
      await db.from("user_api_keys").update({ is_default: true }).eq("id", next.id);
    }
  }
  return true;
}

export async function setDefault(
  id: string,
  userId: string,
  db: Db = createServerSupabase(),
): Promise<ApiKey | null> {
  const { data: row } = await db
    .from("user_api_keys")
    .select("id, user_id, provider, label, encrypted_key, iv, auth_tag, is_default, created_at, last_used_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;

  // Clear existing default for the same provider, then mark this one.
  await db
    .from("user_api_keys")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("provider", (row as KeyRow).provider)
    .eq("is_default", true);
  const { data: updated, error } = await db
    .from("user_api_keys")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, user_id, provider, label, encrypted_key, iv, auth_tag, is_default, created_at, last_used_at")
    .single();
  if (error || !updated) return null;
  return toPublic(updated as KeyRow);
}

export async function providerHasKey(
  userId: string,
  provider: Provider,
  db: Db = createServerSupabase(),
): Promise<boolean> {
  const { count, error } = await db
    .from("user_api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) return false;
  if ((count ?? 0) > 0) return true;

  // Fall back to server-side env so the legal-cloud demo works without
  // forcing every visitor to paste a key in. (Same priority as
  // lib/userApiKeys.ts — user keys win, then env.)
  const envMap: Record<Provider, string> = {
    claude: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    gemini: "GEMINI_API_KEY",
    voyage: "VOYAGE_API_KEY",
    cohere: "COHERE_API_KEY",
    groq: "GROQ_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    mistral: "MISTRAL_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    cerebras: "CEREBRAS_API_KEY",
    perplexity: "PERPLEXITY_API_KEY",
    tavily: "TAVILY_API_KEY",
    firecrawl: "FIRECRAWL_API_KEY",
    huggingface: "HUGGINGFACE_API_KEY",
  };
  return !!process.env[envMap[provider]];
}
