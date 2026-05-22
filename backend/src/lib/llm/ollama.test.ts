/**
 * Wave 4 — Ollama provider adapter tests.
 *
 * All tests mock globalThis.fetch — no real network I/O.
 * Save/restore ensures no cross-test pollution.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ollamaBaseUrl,
  completeOllamaText,
  streamOllama,
  pingOllama,
} from "./ollama";
import type { StreamChatParams } from "./types";

// ---------------------------------------------------------------------------
// fetch mock helpers
// ---------------------------------------------------------------------------

type FetchMock = ReturnType<typeof vi.fn>;

let originalFetch: typeof globalThis.fetch;
let mockFetch: FetchMock;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  mockFetch = vi.fn();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

/** Build a minimal ok Response-like object. */
function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

/** Build a non-ok Response-like object. */
function errResponse(status: number, statusText: string, body = ""): Response {
  return {
    ok: false,
    status,
    statusText,
    json: () => Promise.reject(new Error("not JSON")),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Env var save/restore for OLLAMA_URL
// ---------------------------------------------------------------------------

let savedOllamaUrl: string | undefined;

beforeEach(() => {
  savedOllamaUrl = process.env.OLLAMA_URL;
});

afterEach(() => {
  if (savedOllamaUrl === undefined) {
    delete process.env.OLLAMA_URL;
  } else {
    process.env.OLLAMA_URL = savedOllamaUrl;
  }
});

// ---------------------------------------------------------------------------
// ollamaBaseUrl()
// ---------------------------------------------------------------------------

describe("ollamaBaseUrl()", () => {
  it("returns default when OLLAMA_URL is not set", () => {
    delete process.env.OLLAMA_URL;
    expect(ollamaBaseUrl()).toBe("http://localhost:11434");
  });

  it("returns default when OLLAMA_URL is empty string", () => {
    process.env.OLLAMA_URL = "";
    expect(ollamaBaseUrl()).toBe("http://localhost:11434");
  });

  it("returns default when OLLAMA_URL is whitespace only", () => {
    process.env.OLLAMA_URL = "   ";
    expect(ollamaBaseUrl()).toBe("http://localhost:11434");
  });

  it("honors OLLAMA_URL when set", () => {
    process.env.OLLAMA_URL = "http://ollama-host:11434";
    expect(ollamaBaseUrl()).toBe("http://ollama-host:11434");
  });

  it("strips trailing slash from OLLAMA_URL", () => {
    process.env.OLLAMA_URL = "http://ollama-host:11434/";
    expect(ollamaBaseUrl()).toBe("http://ollama-host:11434");
  });

  it("strips multiple trailing slashes", () => {
    process.env.OLLAMA_URL = "http://ollama-host:11434///";
    expect(ollamaBaseUrl()).toBe("http://ollama-host:11434");
  });
});

// ---------------------------------------------------------------------------
// completeOllamaText()
// ---------------------------------------------------------------------------

describe("completeOllamaText()", () => {
  it("POSTs to /api/chat with correct model and user message", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "Hello!" } }),
    );

    await completeOllamaText({ model: "qwen2.5", user: "Hi there" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/api/chat");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream: boolean;
    };
    expect(body.model).toBe("qwen2.5");
    expect(body.stream).toBe(false);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]).toEqual({ role: "user", content: "Hi there" });
  });

  it("includes system message when systemPrompt is provided", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "OK" } }),
    );

    await completeOllamaText({
      model: "qwen2.5",
      user: "Classify this.",
      systemPrompt: "You are a legal classifier.",
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "You are a legal classifier.",
    });
    expect(body.messages[1]).toEqual({ role: "user", content: "Classify this." });
  });

  it("omits system message when systemPrompt is absent", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "Done" } }),
    );

    await completeOllamaText({ model: "qwen2.5", user: "Hello" });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      messages: Array<{ role: string }>;
    };
    expect(body.messages.every((m) => m.role !== "system")).toBe(true);
  });

  it("includes num_predict in options when maxTokens is provided", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "short" } }),
    );

    await completeOllamaText({
      model: "qwen2.5",
      user: "Summarise.",
      maxTokens: 128,
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      options?: { num_predict?: number };
    };
    expect(body.options?.num_predict).toBe(128);
  });

  it("omits options when maxTokens is not provided", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "ok" } }),
    );

    await completeOllamaText({ model: "qwen2.5", user: "Hello" });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { options?: unknown };
    expect(body.options).toBeUndefined();
  });

  it("returns the assistant content string", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "The answer is 42." } }),
    );

    const result = await completeOllamaText({ model: "qwen2.5", user: "What is the answer?" });
    expect(result).toBe("The answer is 42.");
  });

  it("returns empty string when message is missing from response", async () => {
    mockFetch.mockResolvedValue(okResponse({}));

    const result = await completeOllamaText({ model: "qwen2.5", user: "Hello" });
    expect(result).toBe("");
  });

  it("throws a descriptive error on non-OK response", async () => {
    mockFetch.mockResolvedValue(errResponse(500, "Internal Server Error", "model not found"));

    await expect(
      completeOllamaText({ model: "bad-model", user: "test" }),
    ).rejects.toThrow(/Ollama \/api\/chat error 500/);
  });

  it("error message includes status code and body text", async () => {
    mockFetch.mockResolvedValue(errResponse(404, "Not Found", "model missing"));

    await expect(
      completeOllamaText({ model: "missing", user: "test" }),
    ).rejects.toThrow(/404.*model missing/);
  });

  it("uses OLLAMA_URL from env as base", async () => {
    process.env.OLLAMA_URL = "http://custom-host:9999";
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "hi" } }),
    );

    await completeOllamaText({ model: "qwen2.5", user: "Hello" });

    const [url] = mockFetch.mock.calls[0] as [string, ...unknown[]];
    expect(url).toBe("http://custom-host:9999/api/chat");
  });
});

// ---------------------------------------------------------------------------
// streamOllama()
// ---------------------------------------------------------------------------

describe("streamOllama()", () => {
  const baseParams: StreamChatParams = {
    model: "qwen2.5",
    systemPrompt: "You are a helpful legal assistant.",
    messages: [{ role: "user", content: "Summarise the contract." }],
  };

  it("returns a StreamChatResult with fullText", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "Summary here." } }),
    );

    const result = await streamOllama(baseParams);
    expect(result).toHaveProperty("fullText");
    expect(result.fullText).toBe("Summary here.");
  });

  it("POSTs to /api/chat with stream:false", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "ok" } }),
    );

    await streamOllama(baseParams);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/chat");
    const body = JSON.parse(init.body as string) as { stream: boolean };
    expect(body.stream).toBe(false);
  });

  it("includes system prompt in messages", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "ok" } }),
    );

    await streamOllama(baseParams);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "You are a helpful legal assistant.",
    });
  });

  it("fires onContentDelta callback with full text", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "Delta content." } }),
    );

    const onContentDelta = vi.fn();
    await streamOllama({ ...baseParams, callbacks: { onContentDelta } });

    expect(onContentDelta).toHaveBeenCalledOnce();
    expect(onContentDelta).toHaveBeenCalledWith("Delta content.");
  });

  it("does not fire onContentDelta when response is empty", async () => {
    mockFetch.mockResolvedValue(okResponse({ message: { role: "assistant", content: "" } }));

    const onContentDelta = vi.fn();
    await streamOllama({ ...baseParams, callbacks: { onContentDelta } });

    expect(onContentDelta).not.toHaveBeenCalled();
  });

  it("maps assistant messages to assistant role in Ollama format", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ message: { role: "assistant", content: "ok" } }),
    );

    await streamOllama({
      ...baseParams,
      messages: [
        { role: "user", content: "Question?" },
        { role: "assistant", content: "Previous answer." },
        { role: "user", content: "Follow-up?" },
      ],
    });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    // system + 3 history messages
    const nonSystem = body.messages.filter((m) => m.role !== "system");
    expect(nonSystem[1]).toEqual({ role: "assistant", content: "Previous answer." });
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue(errResponse(503, "Service Unavailable", "busy"));

    await expect(streamOllama(baseParams)).rejects.toThrow(/503/);
  });
});

// ---------------------------------------------------------------------------
// pingOllama()
// ---------------------------------------------------------------------------

describe("pingOllama()", () => {
  it("returns true when /api/tags responds with ok:true", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ models: [] }),
    );

    const result = await pingOllama();
    expect(result).toBe(true);
  });

  it("GETs /api/tags on the default base URL", async () => {
    delete process.env.OLLAMA_URL;
    mockFetch.mockResolvedValue(okResponse({ models: [] }));

    await pingOllama();

    const [url] = mockFetch.mock.calls[0] as [string, ...unknown[]];
    expect(url).toBe("http://localhost:11434/api/tags");
  });

  it("GETs /api/tags on the env-configured base URL", async () => {
    process.env.OLLAMA_URL = "http://remote-ollama:11434";
    mockFetch.mockResolvedValue(okResponse({ models: [] }));

    await pingOllama();

    const [url] = mockFetch.mock.calls[0] as [string, ...unknown[]];
    expect(url).toBe("http://remote-ollama:11434/api/tags");
  });

  it("returns false when /api/tags responds with ok:false (non-2xx)", async () => {
    mockFetch.mockResolvedValue(errResponse(503, "Service Unavailable"));

    const result = await pingOllama();
    expect(result).toBe(false);
  });

  it("returns false when fetch throws (network error)", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await pingOllama();
    expect(result).toBe(false);
  });

  it("returns false when fetch rejects with a non-Error value", async () => {
    mockFetch.mockRejectedValue("timeout");

    const result = await pingOllama();
    expect(result).toBe(false);
  });

  it("never throws regardless of fetch outcome", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    // This must resolve, not reject.
    await expect(pingOllama()).resolves.toBe(false);
  });
});
