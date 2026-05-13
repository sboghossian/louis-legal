/**
 * @louis/sdk — official TypeScript client for the Louis public API.
 *
 * Designed to mirror the shape of @anthropic-ai/sdk and openai's clients:
 * resource-named handles hanging off a single client (`louis.chat.complete`,
 * `louis.documents.upload`, …) plus an `AsyncIterable` for the SSE event
 * stream. The HTTP layer is intentionally tiny — `fetch` only, no extra
 * deps, so it ships cleanly to Node 18+, Bun, Deno, and the browser.
 */

export interface LouisClientOptions {
    /** Public API token, e.g. `pk_louis_<random>`. Required. */
    apiKey: string;
    /** Origin of the Louis backend, e.g. `https://louis.example.com`. */
    baseUrl?: string;
    /** Optional `fetch` override — useful for tests or platforms with custom HTTP. */
    fetch?: typeof fetch;
}

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

export interface ChatRequest {
    messages: ChatMessage[];
    model?: string;
    system?: string;
    max_tokens?: number;
}

export interface ChatResponse {
    model: string;
    content: string;
}

export interface SkillSummary {
    id: string;
    name: string;
    category?: string;
    priority?: string;
}

export interface SkillRunRequest {
    skill_id: string;
    input: string;
    model?: string;
}

export interface SkillRunResponse {
    skill_id: string;
    model: string;
    content: string;
}

export interface WorkflowRunRequest {
    workflow_id: string;
    input: string;
    model?: string;
}

export interface WorkflowRunResponse {
    workflow_id: string;
    model: string;
    content: string;
}

export interface DocumentUploadRequest {
    filename: string;
    bytes: Uint8Array | ArrayBuffer | Blob;
}

export interface ParsedDocument {
    id: string;
    filename: string;
    text?: string;
    preview?: string;
    length: number;
    created_at?: string;
}

export type LouisEventType =
    | "matter.created"
    | "matter.updated"
    | "document.parsed"
    | "chat.turn"
    | "routine.completed"
    | "workflow.gate.opened"
    | "skill.fired";

export interface LouisEvent<P = Record<string, unknown>> {
    type: LouisEventType;
    id: string;
    occurredAt: string;
    userId: string | null;
    payload: P;
}

export interface PluginManifest {
    id: string;
    name: string;
    description: string;
    icon: string;
    install_url: string;
    repo_url: string;
    category: string;
    author: string;
    version: string;
    verified: boolean;
}

interface Envelope<T> {
    data: T | null;
    error: { code: string; message: string } | null;
    meta: Record<string, unknown>;
}

export class LouisApiError extends Error {
    public readonly code: string;
    public readonly status: number;
    constructor(code: string, message: string, status: number) {
        super(message);
        this.name = "LouisApiError";
        this.code = code;
        this.status = status;
    }
}

/**
 * Thin HTTP transport. Unwraps the `{ data, error, meta }` envelope and
 * throws `LouisApiError` on any non-2xx or `error != null`.
 */
class Transport {
    constructor(
        private readonly opts: Required<Pick<LouisClientOptions, "apiKey" | "baseUrl">> & {
            fetch: typeof fetch;
        },
    ) {}

    private url(path: string): string {
        return `${this.opts.baseUrl.replace(/\/$/, "")}${path}`;
    }

    private authHeaders(): Record<string, string> {
        return { Authorization: `Bearer ${this.opts.apiKey}` };
    }

    async json<T>(
        path: string,
        init?: { method?: string; body?: unknown; headers?: Record<string, string> },
    ): Promise<T> {
        const headers: Record<string, string> = {
            ...this.authHeaders(),
            ...(init?.headers ?? {}),
        };
        let body: BodyInit | undefined;
        if (init?.body !== undefined) {
            if (init.body instanceof FormData) {
                body = init.body;
            } else {
                headers["Content-Type"] = "application/json";
                body = JSON.stringify(init.body);
            }
        }
        const res = await this.opts.fetch(this.url(path), {
            method: init?.method ?? "GET",
            headers,
            body,
        });
        let envelope: Envelope<T> | undefined;
        try {
            envelope = (await res.json()) as Envelope<T>;
        } catch {
            // Body wasn't JSON — surface the HTTP status.
            throw new LouisApiError(
                "http_error",
                `HTTP ${res.status} ${res.statusText}`,
                res.status,
            );
        }
        if (!res.ok || envelope?.error) {
            const err = envelope?.error ?? {
                code: "http_error",
                message: `HTTP ${res.status}`,
            };
            throw new LouisApiError(err.code, err.message, res.status);
        }
        return (envelope?.data ?? null) as T;
    }

    sseUrl(path: string): string {
        return this.url(path);
    }

    headers(): Record<string, string> {
        return this.authHeaders();
    }
}

/**
 * High-level resource handles. Each handle is a thin wrapper around the
 * Transport — the SDK does no caching, no retry logic, and no LLM-side work.
 */
export class LouisClient {
    private readonly t: Transport;

    public readonly chat: {
        complete: (req: ChatRequest) => Promise<ChatResponse>;
        stream: (req: ChatRequest) => AsyncIterable<ChatStreamEvent>;
    };

    public readonly documents: {
        upload: (req: DocumentUploadRequest) => Promise<ParsedDocument>;
        get: (id: string) => Promise<ParsedDocument>;
    };

    public readonly skills: {
        list: (filter?: { category?: string; priority?: string; q?: string; limit?: number; offset?: number }) => Promise<SkillSummary[]>;
        run: (req: SkillRunRequest) => Promise<SkillRunResponse>;
    };

    public readonly workflows: {
        run: (req: WorkflowRunRequest) => Promise<WorkflowRunResponse>;
    };

    public readonly plugins: {
        list: () => Promise<PluginManifest[]>;
    };

    public readonly events: {
        stream: () => AsyncIterable<LouisEvent>;
    };

    constructor(opts: LouisClientOptions) {
        if (!opts.apiKey) throw new Error("LouisClient: apiKey is required");
        const t = new Transport({
            apiKey: opts.apiKey,
            baseUrl: opts.baseUrl ?? "https://louis.example.com",
            fetch: opts.fetch ?? globalThis.fetch.bind(globalThis),
        });
        this.t = t;

        this.chat = {
            complete: (req) => t.json<ChatResponse>("/api/v1/chat", { method: "POST", body: req }),
            stream: (req) => streamSse<ChatStreamEvent>(t, "/api/v1/chat/stream", "POST", req),
        };

        this.documents = {
            upload: async (req) => {
                const form = new FormData();
                const blob =
                    req.bytes instanceof Blob
                        ? req.bytes
                        : new Blob([req.bytes as BlobPart]);
                form.append("file", blob, req.filename);
                return t.json<ParsedDocument>("/api/v1/documents", {
                    method: "POST",
                    body: form,
                });
            },
            get: (id) => t.json<ParsedDocument>(`/api/v1/documents/${encodeURIComponent(id)}`),
        };

        this.skills = {
            list: async (filter) => {
                const q = new URLSearchParams();
                if (filter?.category) q.set("category", filter.category);
                if (filter?.priority) q.set("priority", filter.priority);
                if (filter?.q) q.set("q", filter.q);
                if (filter?.limit) q.set("limit", String(filter.limit));
                if (filter?.offset) q.set("offset", String(filter.offset));
                const qs = q.toString();
                const data = await t.json<{ skills: SkillSummary[] }>(
                    `/api/v1/skills${qs ? `?${qs}` : ""}`,
                );
                return data.skills;
            },
            run: (req) => t.json<SkillRunResponse>("/api/v1/skills/run", { method: "POST", body: req }),
        };

        this.workflows = {
            run: (req) => t.json<WorkflowRunResponse>("/api/v1/workflows/run", { method: "POST", body: req }),
        };

        this.plugins = {
            list: async () => {
                const data = await t.json<{ plugins: PluginManifest[] }>("/api/v1/plugins");
                return data.plugins;
            },
        };

        this.events = {
            stream: () => streamSse<LouisEvent>(t, "/api/v1/events", "GET"),
        };
    }
}

export interface ChatStreamEvent {
    /** SSE event name — "start" | "delta" | "done" | "error". */
    event: string;
    data: Record<string, unknown>;
}

/**
 * Generic SSE async-iterator. Pulls newline-delimited `event:` + `data:`
 * frames out of a `fetch` stream and yields them as plain objects. Falls
 * back to {event: "message"} if the server omits the event field.
 */
async function* streamSse<T>(
    t: Transport,
    path: string,
    method: "GET" | "POST",
    body?: unknown,
): AsyncGenerator<T> {
    const headers: Record<string, string> = {
        ...t.headers(),
        Accept: "text/event-stream",
    };
    let init: RequestInit = { method, headers };
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        init = { ...init, body: JSON.stringify(body) };
    }
    const res = await fetch(t.sseUrl(path), init);
    if (!res.ok || !res.body) {
        throw new LouisApiError(
            "stream_error",
            `Failed to open SSE: HTTP ${res.status}`,
            res.status,
        );
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        // SSE frames are separated by blank lines.
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) {
            if (!frame.trim() || frame.startsWith(":")) continue;
            let event = "message";
            const dataLines: string[] = [];
            for (const line of frame.split("\n")) {
                if (line.startsWith("event:")) {
                    event = line.slice(6).trim();
                } else if (line.startsWith("data:")) {
                    dataLines.push(line.slice(5).trim());
                }
            }
            if (!dataLines.length) continue;
            const raw = dataLines.join("\n");
            try {
                const parsed = JSON.parse(raw);
                yield { event, data: parsed } as unknown as T;
            } catch {
                yield { event, data: raw } as unknown as T;
            }
        }
    }
}
