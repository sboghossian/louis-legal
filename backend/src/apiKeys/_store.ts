/**
 * API Keys store — per-user-tenant keys for each AI provider.
 * Keys are masked when read back (only last 4 chars exposed). Plaintext is
 * stored in memory for the running process; future SQL should encrypt at
 * rest using USER_API_KEYS_ENCRYPTION_SECRET (already provisioned).
 *
 * CREATE TABLE api_keys (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id text NOT NULL,
 *   provider text NOT NULL,
 *   label text,
 *   key_encrypted text NOT NULL,   -- AES-256-GCM with env key
 *   key_last4 text NOT NULL,
 *   is_default boolean DEFAULT false,
 *   created_at timestamptz DEFAULT now(),
 *   last_used_at timestamptz
 * );
 *
 * CREATE UNIQUE INDEX one_default_per_provider ON api_keys (user_id, provider) WHERE is_default;
 */

import crypto from "crypto";

export type Provider =
  | "anthropic"
  | "openai"
  | "google"
  | "voyage"
  | "groq"
  | "deepseek"
  | "mistral"
  | "openrouter"
  | "cerebras"
  | "perplexity"
  | "tavily"
  | "firecrawl"
  | "huggingface";

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

interface InternalApiKey extends ApiKey {
  // Plaintext kept in-process only; never returned via API
  plaintext: string;
}

const KEYS = new Map<string, InternalApiKey>();

function maskKey(key: string): { masked: string; last4: string } {
  if (key.length <= 8) return { masked: "•".repeat(key.length), last4: key.slice(-4) };
  const last4 = key.slice(-4);
  return { masked: `${key.slice(0, 4)}${"•".repeat(Math.max(8, key.length - 8))}${last4}`, last4 };
}

export function listKeys(userId: string, provider?: Provider): ApiKey[] {
  return Array.from(KEYS.values())
    .filter(k => k.userId === userId)
    .filter(k => !provider || k.provider === provider)
    .map(({ plaintext, ...safe }) => safe);
}

export function addKey(userId: string, provider: Provider, key: string, label?: string, makeDefault?: boolean): ApiKey {
  const id = crypto.randomUUID();
  const { masked, last4 } = maskKey(key);
  const isDefault = !!makeDefault || !Array.from(KEYS.values()).some(k => k.userId === userId && k.provider === provider);
  if (isDefault) {
    // Unset existing default for this provider
    for (const existing of KEYS.values()) {
      if (existing.userId === userId && existing.provider === provider) existing.isDefault = false;
    }
  }
  const entry: InternalApiKey = {
    id,
    userId,
    provider,
    label,
    keyMasked: masked,
    keyLast4: last4,
    plaintext: key,
    isDefault,
    createdAt: new Date().toISOString(),
  };
  KEYS.set(id, entry);
  const { plaintext, ...safe } = entry;
  return safe;
}

export function deleteKey(id: string, userId: string): boolean {
  const k = KEYS.get(id);
  if (!k || k.userId !== userId) return false;
  KEYS.delete(id);
  return true;
}

export function setDefault(id: string, userId: string): ApiKey | undefined {
  const k = KEYS.get(id);
  if (!k || k.userId !== userId) return undefined;
  for (const existing of KEYS.values()) {
    if (existing.userId === userId && existing.provider === k.provider) existing.isDefault = false;
  }
  k.isDefault = true;
  const { plaintext, ...safe } = k;
  return safe;
}

export function getDefaultKeyValue(userId: string, provider: Provider): string | undefined {
  for (const k of KEYS.values()) {
    if (k.userId === userId && k.provider === provider && k.isDefault) return k.plaintext;
  }
  // Fallback to env default
  const envMap: Record<Provider, string> = {
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GEMINI_API_KEY",
    voyage: "VOYAGE_API_KEY",
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
  return process.env[envMap[provider]];
}

export function providerHasKey(userId: string, provider: Provider): boolean {
  return !!getDefaultKeyValue(userId, provider);
}
