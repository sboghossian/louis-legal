/**
 * Wave 4 — Ollama provider adapter.
 *
 * Implements the same surface contract as the Claude and Gemini adapters:
 *   - completeOllamaText  → one-shot text completion via /api/chat (stream:false)
 *   - streamOllama        → fulfils StreamChatResult; see limitation note below
 *   - pingOllama          → real TCP reachability probe (complements triage's
 *                           env-gate isLocalAvailable() which does no network I/O)
 *   - ollamaBaseUrl       → env-driven base URL helper
 *
 * Streaming limitation
 * ────────────────────
 * Ollama's /api/chat endpoint sends newline-delimited JSON chunks when
 * stream:true. Consuming that stream in a Worker/Node fetch response body
 * requires the ReadableStream async iteration API, which is available in
 * Node 18+ but is orthogonal to the existing StreamChatParams.callbacks wiring.
 * streamOllama currently collects the full response in one shot (stream:false)
 * and invokes onContentDelta once with the complete text, then returns the same
 * { fullText } shape as streamClaude/streamGemini. Token-by-token streaming can
 * be added in a future wave without changing the public signature.
 *
 * Dispatch wiring (for the lead)
 * ───────────────────────────────
 * When triage.decideModelRoute() returns { target: "local", model }, the
 * dispatcher in lib/llm/index.ts (or the relevant route handler) should call:
 *
 *   import { streamOllama, completeOllamaText } from "./ollama";
 *
 *   // For streaming chat:
 *   return streamOllama({ ...params, model: route.model });
 *
 *   // For one-shot completion (e.g. triage/classification helpers):
 *   return completeOllamaText({ model: route.model, user, systemPrompt, maxTokens });
 *
 * The change is additive: the existing frontier path in index.ts is unchanged.
 * Only the target:"local" branch needs a new else-if arm.
 */

import type { StreamChatParams, StreamChatResult } from "./types";

// ---------------------------------------------------------------------------
// Base URL helper
// ---------------------------------------------------------------------------

/**
 * Return the Ollama base URL.
 *
 * Reads `OLLAMA_URL` from the environment and strips trailing slashes.
 * Falls back to the standard local default when the var is absent or empty.
 */
export function ollamaBaseUrl(): string {
  const env = process.env.OLLAMA_URL;
  if (env && env.trim().length > 0) {
    return env.trim().replace(/\/+$/, "");
  }
  return "http://localhost:11434";
}

// ---------------------------------------------------------------------------
// Ollama /api/chat request/response shapes (no external dep — plain fetch)
// ---------------------------------------------------------------------------

type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OllamaChatRequest = {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options?: {
    num_predict?: number;
  };
};

type OllamaChatResponse = {
  message?: {
    role: string;
    content: string;
  };
  // Ollama also returns done, eval_count, etc. — we only need message.
};

// ---------------------------------------------------------------------------
// completeOllamaText
// ---------------------------------------------------------------------------

/**
 * One-shot text completion via Ollama's /api/chat endpoint.
 *
 * Posts with stream:false so the full response arrives in a single JSON body.
 * Throws a descriptive Error on any non-2xx response.
 */
export async function completeOllamaText(params: {
  model: string;
  systemPrompt?: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const { model, systemPrompt, user, maxTokens } = params;
  const base = ollamaBaseUrl();

  const messages: OllamaMessage[] = [];
  if (systemPrompt && systemPrompt.trim().length > 0) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: user });

  const body: OllamaChatRequest = {
    model,
    messages,
    stream: false,
    ...(maxTokens !== undefined ? { options: { num_predict: maxTokens } } : {}),
  };

  const resp = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "(no body)");
    throw new Error(
      `Ollama /api/chat error ${resp.status} ${resp.statusText}: ${errText}`,
    );
  }

  const data = (await resp.json()) as OllamaChatResponse;
  return data.message?.content ?? "";
}

// ---------------------------------------------------------------------------
// streamOllama
// ---------------------------------------------------------------------------

/**
 * Fulfils the StreamChatResult contract against Ollama.
 *
 * Implementation note: uses stream:false (single-shot) and calls
 * onContentDelta once with the full text. True token streaming is deferred
 * to a future wave — the signature is stable and the limitation is documented
 * at the top of this file.
 *
 * Tool calls and multi-turn tool loops are not supported by Ollama's /api/chat
 * in the way Claude/Gemini implement them; params.tools and params.runTools
 * are silently ignored.
 */
export async function streamOllama(
  params: StreamChatParams,
): Promise<StreamChatResult> {
  const { model, systemPrompt, messages, callbacks = {}, maxIterations: _ignored } =
    params;

  // Flatten the message history into the Ollama format.
  const ollamaMessages: OllamaMessage[] = [];
  if (systemPrompt && systemPrompt.trim().length > 0) {
    ollamaMessages.push({ role: "system", content: systemPrompt });
  }
  for (const m of messages) {
    ollamaMessages.push({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    });
  }

  const base = ollamaBaseUrl();
  const body: OllamaChatRequest = {
    model,
    messages: ollamaMessages,
    stream: false,
  };

  const resp = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "(no body)");
    throw new Error(
      `Ollama /api/chat error ${resp.status} ${resp.statusText}: ${errText}`,
    );
  }

  const data = (await resp.json()) as OllamaChatResponse;
  const fullText = data.message?.content ?? "";

  // Fire the content delta callback so callers that stream to a client get
  // the text (as a single chunk rather than token-by-token).
  if (fullText.length > 0) {
    callbacks.onContentDelta?.(fullText);
  }

  return { fullText };
}

// ---------------------------------------------------------------------------
// pingOllama
// ---------------------------------------------------------------------------

/**
 * Probe Ollama TCP reachability by GET-ing /api/tags.
 *
 * Returns true if the endpoint responds with a 2xx status, false on any
 * error (network failure, timeout, non-2xx, etc.). Never throws.
 *
 * This is the real reachability probe that complements triage's env-gate
 * isLocalAvailable() (which only checks whether OLLAMA_URL is set, not
 * whether the daemon is actually running).
 *
 * Recommended usage pattern in the dispatcher:
 *   const alive = await pingOllama();
 *   const route = decideModelRoute({ intensity, localAvailable: alive });
 */
export async function pingOllama(): Promise<boolean> {
  try {
    const base = ollamaBaseUrl();
    const resp = await fetch(`${base}/api/tags`);
    return resp.ok;
  } catch {
    return false;
  }
}
