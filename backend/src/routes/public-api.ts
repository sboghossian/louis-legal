/**
 * Public Developer API — `/api/v1/*`.
 *
 * Versioned, token-authenticated surface for firm developers building on top
 * of Louis. Tokens are minted from a signed-in Supabase session at
 * POST /api/v1/tokens, returned once in plain form (`pk_louis_…`) and stored
 * **hashed** in the `public_api_tokens` Supabase table (see migration
 * 2026-05-13-public-api-tokens.sql). A small in-process LRU cache fronts the
 * DB lookup so the auth hot path doesn't round-trip on every request.
 *
 * Auth model:
 *   - `Authorization: Bearer <supabase-jwt>` — used only on POST /tokens to
 *     mint a key. The minted key is owned by the calling Supabase user.
 *   - `Authorization: Bearer pk_louis_<random>` — used on every other route.
 *     The key is hashed and looked up in `public_api_tokens`; the attached
 *     `userId` becomes the principal for the request (so the existing
 *     per-user data plane — chat history, documents, skills, workflows —
 *     applies automatically).
 *
 * Response envelope:
 *
 *   {
 *     data:  T | null,       // the resource on success
 *     error: { code, message } | null,
 *     meta:  { request_id, version } & extras
 *   }
 *
 * The product is BYO-LLM-key — public API tokens authorize the caller, but
 * chat completions still bill against the user's own provider key
 * (Anthropic / OpenAI / Gemini) stored in `getUserApiKeys`.
 */

import { Router, Request, Response, NextFunction } from "express";
import { createHash, randomBytes, randomUUID } from "crypto";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";
import { singleFileUpload } from "../lib/upload";
import { getUserApiKeys, getUserModelSettings } from "../lib/userSettings";
import { completeText, DEFAULT_MAIN_MODEL, resolveModel } from "../lib/llm";
import { listSkills, getSkill, composeSystemPrompt } from "../skills/_loader";
import { emitLouisEvent } from "../lib/events";

export const publicApiRouter = Router();

// ---------------------------------------------------------------------------
// Token store
// ---------------------------------------------------------------------------
// Tokens live in `public.public_api_tokens` (see migration
// 2026-05-13-public-api-tokens.sql). Each row keys on the SHA-256 hash of
// the secret (`pk_louis_<random>`), never the secret itself — Louis cannot
// recover a lost token, you revoke and mint a new one.
//
// To keep the auth middleware off the DB on every request, we maintain a
// small in-process LRU cache keyed on `token_hash` → `{ userId, tokenId }`.
// Entries TTL out after 5 minutes and the cache is bounded to 1k entries.
// Revocation invalidates the cache entry immediately so a revoked token
// cannot survive past one request after revocation in the same process.

function hashToken(secret: string): string {
    return createHash("sha256").update(secret).digest("hex");
}

function mintToken(): { secret: string; prefix: string } {
    // 32 random bytes → 64 hex chars. Enough entropy that brute-force is a
    // non-issue even without the rate limiter that wraps all of /api/v1.
    const random = randomBytes(32).toString("hex");
    const secret = `pk_louis_${random}`;
    const prefix = secret.slice(0, 12); // displayed in lists, never the full secret
    return { secret, prefix };
}

interface TokenCacheEntry {
    userId: string;
    tokenId: string;
    expiresAt: number; // ms epoch
}

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const TOKEN_CACHE_MAX = 1000;

// JS Maps preserve insertion order — re-inserting on hit gives us cheap LRU
// semantics without pulling in a dependency.
const tokenCache = new Map<string, TokenCacheEntry>();

function cacheGet(hash: string): TokenCacheEntry | null {
    const entry = tokenCache.get(hash);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
        tokenCache.delete(hash);
        return null;
    }
    // Bump to most-recent: delete + re-insert.
    tokenCache.delete(hash);
    tokenCache.set(hash, entry);
    return entry;
}

function cacheSet(hash: string, userId: string, tokenId: string): void {
    if (tokenCache.has(hash)) tokenCache.delete(hash);
    tokenCache.set(hash, {
        userId,
        tokenId,
        expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });
    if (tokenCache.size > TOKEN_CACHE_MAX) {
        // Drop oldest (first inserted).
        const oldest = tokenCache.keys().next().value;
        if (oldest) tokenCache.delete(oldest);
    }
}

function cacheInvalidate(predicate: (entry: TokenCacheEntry) => boolean): void {
    for (const [hash, entry] of tokenCache.entries()) {
        if (predicate(entry)) tokenCache.delete(hash);
    }
}

// ---------------------------------------------------------------------------
// Envelope helpers
// ---------------------------------------------------------------------------

interface Envelope<T> {
    data: T | null;
    error: { code: string; message: string } | null;
    meta: Record<string, unknown>;
}

function ok<T>(res: Response, data: T, extraMeta?: Record<string, unknown>) {
    const body: Envelope<T> = {
        data,
        error: null,
        meta: {
            request_id: res.locals.requestId ?? randomUUID(),
            version: "v1",
            ...(extraMeta ?? {}),
        },
    };
    res.json(body);
}

function fail(
    res: Response,
    status: number,
    code: string,
    message: string,
): void {
    const body: Envelope<null> = {
        data: null,
        error: { code, message },
        meta: {
            request_id: res.locals.requestId ?? randomUUID(),
            version: "v1",
        },
    };
    res.status(status).json(body);
}

// Tag every request with a request_id so we can correlate logs ↔ envelopes
// without adding a heavy middleware stack.
publicApiRouter.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.requestId = randomUUID();
    next();
});

// ---------------------------------------------------------------------------
// Auth middlewares
// ---------------------------------------------------------------------------

/**
 * Authenticates the request using a `pk_louis_…` API token. Populates
 * `res.locals.userId` and `res.locals.apiTokenId` so downstream handlers can
 * call into the same Supabase-scoped helpers as the rest of the app.
 *
 * Hot path: a 5-minute in-process LRU cache fronts the DB lookup so the
 * common case (caller hammering the API with the same token) doesn't round-
 * trip to Supabase. Misses fall through to a SELECT against
 * `public_api_tokens` filtered on `revoked_at IS NULL` and `expires_at`.
 */
export async function requireApiToken(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) {
        fail(res, 401, "missing_token", "Authorization: Bearer <token> required");
        return;
    }
    const secret = auth.slice(7).trim();
    if (!secret.startsWith("pk_louis_")) {
        fail(
            res,
            401,
            "invalid_token_prefix",
            "Public API tokens must start with pk_louis_",
        );
        return;
    }

    const hash = hashToken(secret);
    const nowIso = new Date().toISOString();

    const cached = cacheGet(hash);
    if (cached) {
        res.locals.userId = cached.userId;
        res.locals.apiTokenId = cached.tokenId;
        // Fire-and-forget last_used_at touch; don't await, don't crash on err.
        touchLastUsed(cached.tokenId, nowIso);
        next();
        return;
    }

    try {
        const db = createServerSupabase();
        const { data, error } = await db
            .from("public_api_tokens")
            .select("id, user_id, expires_at")
            .eq("token_hash", hash)
            .is("revoked_at", null)
            .maybeSingle();
        if (error || !data) {
            fail(res, 401, "invalid_token", "Unknown or revoked token");
            return;
        }
        const row = data as {
            id: string;
            user_id: string;
            expires_at: string | null;
        };
        if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
            fail(res, 401, "invalid_token", "Token has expired");
            return;
        }
        cacheSet(hash, row.user_id, row.id);
        res.locals.userId = row.user_id;
        res.locals.apiTokenId = row.id;
        touchLastUsed(row.id, nowIso);
        next();
    } catch (err) {
        const msg = err instanceof Error ? err.message : "auth lookup failed";
        fail(res, 500, "auth_error", msg);
    }
}

function touchLastUsed(tokenId: string, nowIso: string): void {
    // Best-effort. We don't block the request on this and we swallow errors
    // — a missed last_used_at write is not worth surfacing to the caller.
    try {
        const db = createServerSupabase();
        void db
            .from("public_api_tokens")
            .update({ last_used_at: nowIso })
            .eq("id", tokenId)
            .then(() => undefined, () => undefined);
    } catch {
        /* ignore */
    }
}

// ---------------------------------------------------------------------------
// Token management — gated by Supabase session, not by API token
// ---------------------------------------------------------------------------

// POST /api/v1/tokens — mint a new key. Requires a Supabase JWT (the user
// has to actually own a Louis account to mint API keys). The plaintext
// `token` field is returned exactly once; afterwards we only ever have the
// SHA-256 hash on file.
publicApiRouter.post(
    "/tokens",
    requireAuth,
    async (req: Request, res: Response) => {
        const userId = res.locals.userId as string;
        const labelRaw = (req.body?.label ?? "").toString().trim();
        const label = labelRaw.slice(0, 80) || "untitled key";
        const expiresAtRaw = req.body?.expires_at;
        const expiresAt =
            typeof expiresAtRaw === "string" && expiresAtRaw.length > 0
                ? new Date(expiresAtRaw).toISOString()
                : null;

        const { secret, prefix } = mintToken();
        const tokenHash = hashToken(secret);

        const db = createServerSupabase();
        const { data, error } = await db
            .from("public_api_tokens")
            .insert({
                user_id: userId,
                token_hash: tokenHash,
                label,
                prefix,
                expires_at: expiresAt,
            })
            .select("id, label, prefix, created_at, expires_at")
            .single();
        if (error || !data) {
            const msg = error?.message ?? "failed to persist token";
            return fail(res, 500, "token_create_failed", msg);
        }
        const row = data as {
            id: string;
            label: string | null;
            prefix: string | null;
            created_at: string;
            expires_at: string | null;
        };

        // Critical: this is the ONLY response that contains `token`. Subsequent
        // GETs only return the prefix.
        ok(
            res,
            {
                id: row.id,
                label: row.label,
                prefix: row.prefix,
                token: secret,
                created_at: row.created_at,
                expires_at: row.expires_at,
            },
            { warning: "Store this token now — it will never be shown again." },
        );
    },
);

// GET /api/v1/tokens — list this user's tokens (no secrets revealed).
publicApiRouter.get(
    "/tokens",
    requireAuth,
    async (_req: Request, res: Response) => {
        const userId = res.locals.userId as string;
        const db = createServerSupabase();
        const { data, error } = await db
            .from("public_api_tokens")
            .select(
                "id, label, prefix, created_at, last_used_at, expires_at, revoked_at",
            )
            .eq("user_id", userId)
            .is("revoked_at", null)
            .order("created_at", { ascending: false });
        if (error) {
            return fail(res, 500, "token_list_failed", error.message);
        }
        const tokens = (data ?? []).map((t) => ({
            id: t.id,
            label: t.label,
            prefix: t.prefix,
            created_at: t.created_at,
            last_used_at: t.last_used_at,
            expires_at: t.expires_at,
        }));
        ok(res, { tokens }, { count: tokens.length });
    },
);

// DELETE /api/v1/tokens/:id — revoke a token. We tombstone via revoked_at
// rather than deleting so we keep the audit trail; the partial index on
// (token_hash) WHERE revoked_at IS NULL keeps the auth hot path tight.
publicApiRouter.delete(
    "/tokens/:id",
    requireAuth,
    async (req: Request, res: Response) => {
        const userId = res.locals.userId as string;
        const { id } = req.params;
        const db = createServerSupabase();
        const { data, error } = await db
            .from("public_api_tokens")
            .update({ revoked_at: new Date().toISOString() })
            .eq("id", id)
            .eq("user_id", userId)
            .is("revoked_at", null)
            .select("id")
            .maybeSingle();
        if (error) {
            return fail(res, 500, "token_revoke_failed", error.message);
        }
        if (!data) {
            return fail(res, 404, "not_found", "Token not found");
        }
        cacheInvalidate((entry) => entry.tokenId === id);
        ok(res, { revoked: true, id });
    },
);

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

interface ChatBody {
    messages?: { role: "user" | "assistant" | "system"; content: string }[];
    model?: string;
    system?: string;
    max_tokens?: number;
}

function parseChatBody(body: unknown):
    | { ok: true; messages: { role: string; content: string }[]; model?: string; system?: string; maxTokens?: number }
    | { ok: false; message: string } {
    const b = (body ?? {}) as ChatBody;
    if (!Array.isArray(b.messages) || b.messages.length === 0) {
        return { ok: false, message: "messages must be a non-empty array" };
    }
    for (const m of b.messages) {
        if (!m || typeof m !== "object") {
            return { ok: false, message: "each message must be an object" };
        }
        if (typeof m.role !== "string" || typeof m.content !== "string") {
            return {
                ok: false,
                message: "each message must have string role + content",
            };
        }
    }
    return {
        ok: true,
        messages: b.messages,
        model: b.model,
        system: b.system,
        maxTokens: b.max_tokens,
    };
}

// POST /api/v1/chat — non-streaming completion. Uses the user's stored
// provider keys so they bear the LLM cost.
publicApiRouter.post(
    "/chat",
    requireApiToken,
    async (req: Request, res: Response) => {
        const userId = res.locals.userId as string;
        const parsed = parseChatBody(req.body);
        if (!parsed.ok) {
            return fail(res, 400, "invalid_body", parsed.message);
        }

        const db = createServerSupabase();
        const apiKeys = await getUserApiKeys(userId, db);
        const model = resolveModel(parsed.model, DEFAULT_MAIN_MODEL);

        // Flatten the conversation into a single user prompt for the
        // non-streaming completion endpoint. completeText() is a lightweight
        // wrapper, not the full streaming/tool-aware chat handler — firms
        // that want tool use should use POST /api/v1/chat/stream.
        const transcript = parsed.messages
            .filter((m) => m.role !== "system")
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n\n");
        const systemPrompt =
            parsed.system ??
            parsed.messages.find((m) => m.role === "system")?.content ??
            "You are Louis, a legal AI assistant.";

        try {
            const text = await completeText({
                model,
                systemPrompt,
                user: transcript,
                maxTokens: parsed.maxTokens,
                apiKeys,
            });
            emitLouisEvent({
                type: "chat.turn",
                userId,
                payload: {
                    via: "public-api",
                    model,
                    message_count: parsed.messages.length,
                },
            });
            ok(res, { model, content: text });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "completion failed";
            fail(res, 502, "llm_error", msg);
        }
    },
);

// POST /api/v1/chat/stream — SSE streaming completion. Falls back to a
// streamed single-shot via completeText if the caller doesn't need tool use.
publicApiRouter.post(
    "/chat/stream",
    requireApiToken,
    async (req: Request, res: Response) => {
        const userId = res.locals.userId as string;
        const parsed = parseChatBody(req.body);
        if (!parsed.ok) {
            return fail(res, 400, "invalid_body", parsed.message);
        }

        const db = createServerSupabase();
        const apiKeys = await getUserApiKeys(userId, db);
        const model = resolveModel(parsed.model, DEFAULT_MAIN_MODEL);

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders();

        const write = (event: string, data: unknown) => {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        write("start", { model, request_id: res.locals.requestId });

        try {
            const transcript = parsed.messages
                .filter((m) => m.role !== "system")
                .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
                .join("\n\n");
            const systemPrompt =
                parsed.system ??
                parsed.messages.find((m) => m.role === "system")?.content ??
                "You are Louis, a legal AI assistant.";

            const full = await completeText({
                model,
                systemPrompt,
                user: transcript,
                maxTokens: parsed.maxTokens,
                apiKeys,
            });

            // Chunked replay so consumers can wire up a real EventSource even
            // though the underlying completeText() is non-streaming. The full
            // text-streaming path is on the roadmap (TODO: wire runLLMStream).
            const chunkSize = 256;
            for (let i = 0; i < full.length; i += chunkSize) {
                write("delta", { text: full.slice(i, i + chunkSize) });
            }
            write("done", { length: full.length });
            emitLouisEvent({
                type: "chat.turn",
                userId,
                payload: { via: "public-api/stream", model },
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "stream failed";
            write("error", { code: "llm_error", message: msg });
        } finally {
            res.end();
        }
    },
);

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
//
// Light-weight surface: returns the parsed text directly to the caller and
// stores nothing on disk. The full ingestion pipeline (Supabase row + S3
// storage + versions) lives on POST /single-documents and is too heavy for
// a stateless dev-platform call — firms that want persistence should hit
// that endpoint with their Supabase session.

publicApiRouter.post(
    "/documents",
    requireApiToken,
    singleFileUpload("file"),
    async (req: Request, res: Response) => {
        const userId = res.locals.userId as string;
        const file = req.file;
        if (!file) {
            return fail(res, 400, "missing_file", "Multipart field 'file' is required");
        }
        const filename = file.originalname || "upload";
        const suffix = filename.includes(".")
            ? filename.split(".").pop()!.toLowerCase()
            : "";
        if (!["pdf", "docx", "doc", "txt", "md"].includes(suffix)) {
            return fail(
                res,
                400,
                "unsupported_type",
                `Unsupported file type: ${suffix || "unknown"}`,
            );
        }

        try {
            let text = "";
            if (suffix === "txt" || suffix === "md") {
                text = file.buffer.toString("utf-8");
            } else if (suffix === "docx" || suffix === "doc") {
                const mammoth = await import("mammoth");
                const out = await mammoth.extractRawText({ buffer: file.buffer });
                text = out.value || "";
            } else if (suffix === "pdf") {
                // Lazy-import pdfjs to avoid pulling its workers on cold start.
                const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
                const loadingTask = (pdfjs as unknown as {
                    getDocument: (src: { data: Uint8Array }) => {
                        promise: Promise<unknown>;
                    };
                }).getDocument({ data: new Uint8Array(file.buffer) });
                const pdf = (await loadingTask.promise) as {
                    numPages: number;
                    getPage: (n: number) => Promise<{
                        getTextContent: () => Promise<{
                            items: { str?: string }[];
                        }>;
                    }>;
                };
                const parts: string[] = [];
                for (let p = 1; p <= pdf.numPages; p++) {
                    const page = await pdf.getPage(p);
                    const content = await page.getTextContent();
                    parts.push(
                        content.items
                            .map((it) => it.str ?? "")
                            .join(" "),
                    );
                }
                text = parts.join("\n\n");
            }

            const docId = randomUUID();
            // In-memory only for the public API — see the note below on
            // parsedDocCache. (Tokens themselves are persisted; parsed-doc
            // bodies stay ephemeral because firms that want persistence
            // should be using the full /single-documents pipeline.)
            parsedDocCache.set(docId, {
                userId,
                filename,
                text,
                createdAt: new Date().toISOString(),
            });
            emitLouisEvent({
                type: "document.parsed",
                userId,
                payload: { id: docId, filename, length: text.length },
            });
            ok(res, {
                id: docId,
                filename,
                length: text.length,
                preview: text.slice(0, 500),
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "parse failed";
            fail(res, 500, "parse_error", msg);
        }
    },
);

interface ParsedDoc {
    userId: string;
    filename: string;
    text: string;
    createdAt: string;
}
const parsedDocCache = new Map<string, ParsedDoc>();

publicApiRouter.get(
    "/documents/:id",
    requireApiToken,
    (req: Request, res: Response) => {
        const userId = res.locals.userId as string;
        const row = parsedDocCache.get(req.params.id);
        if (!row || row.userId !== userId) {
            return fail(res, 404, "not_found", "Document not found");
        }
        ok(res, {
            id: req.params.id,
            filename: row.filename,
            text: row.text,
            created_at: row.createdAt,
            length: row.text.length,
        });
    },
);

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

publicApiRouter.get("/skills", requireApiToken, (req: Request, res: Response) => {
    const { category, priority, q } = req.query as Record<string, string | undefined>;
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 200);
    const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);

    let entries = listSkills();
    if (category) entries = entries.filter((e) => e.category === category);
    if (priority) entries = entries.filter((e) => e.priority === priority);
    if (q) {
        const needle = q.toLowerCase();
        entries = entries.filter(
            (e) =>
                e.id.toLowerCase().includes(needle) ||
                e.name.toLowerCase().includes(needle),
        );
    }
    const total = entries.length;
    const page = entries.slice(offset, offset + limit);
    ok(res, { skills: page }, { total, limit, offset });
});

publicApiRouter.post(
    "/skills/run",
    requireApiToken,
    async (req: Request, res: Response) => {
        const userId = res.locals.userId as string;
        const body = (req.body ?? {}) as {
            skill_id?: string;
            input?: string;
            model?: string;
        };
        if (!body.skill_id || typeof body.skill_id !== "string") {
            return fail(res, 400, "missing_skill_id", "skill_id is required");
        }
        if (!body.input || typeof body.input !== "string") {
            return fail(res, 400, "missing_input", "input is required");
        }
        const skill = getSkill(body.skill_id);
        if (!skill) {
            return fail(res, 404, "skill_not_found", `Unknown skill: ${body.skill_id}`);
        }

        const db = createServerSupabase();
        const apiKeys = await getUserApiKeys(userId, db);
        const model = resolveModel(body.model, DEFAULT_MAIN_MODEL);
        const systemPrompt = composeSystemPrompt([skill.frontmatter.id]);

        try {
            const text = await completeText({
                model,
                systemPrompt,
                user: body.input,
                apiKeys,
            });
            emitLouisEvent({
                type: "skill.fired",
                userId,
                payload: { skill_id: skill.frontmatter.id, via: "public-api" },
            });
            ok(res, {
                skill_id: skill.frontmatter.id,
                model,
                content: text,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "skill run failed";
            fail(res, 502, "llm_error", msg);
        }
    },
);

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------

publicApiRouter.post(
    "/workflows/run",
    requireApiToken,
    async (req: Request, res: Response) => {
        const userId = res.locals.userId as string;
        const body = (req.body ?? {}) as {
            workflow_id?: string;
            input?: string;
            model?: string;
        };
        if (!body.workflow_id || typeof body.workflow_id !== "string") {
            return fail(res, 400, "missing_workflow_id", "workflow_id is required");
        }
        if (!body.input || typeof body.input !== "string") {
            return fail(res, 400, "missing_input", "input is required");
        }

        const db = createServerSupabase();
        const { data: workflow, error } = await db
            .from("workflows")
            .select("*")
            .eq("id", body.workflow_id)
            .maybeSingle();
        if (error || !workflow) {
            return fail(res, 404, "workflow_not_found", "Workflow not found");
        }

        // Honor the same access rule as the regular workflows route — owner
        // or system workflow. Shared workflows still need to come through the
        // /workflows surface with their Supabase session.
        const wf = workflow as { user_id: string | null; is_system: boolean; prompt_md?: string | null; title?: string };
        if (!wf.is_system && wf.user_id !== userId) {
            return fail(res, 403, "forbidden", "You do not own this workflow");
        }

        const apiKeys = await getUserApiKeys(userId, db);
        const settings = await getUserModelSettings(userId, db);
        const model = resolveModel(body.model, settings.tabular_model);
        const systemPrompt =
            wf.prompt_md ?? `You are running the workflow: ${wf.title ?? "untitled"}.`;

        try {
            const text = await completeText({
                model,
                systemPrompt,
                user: body.input,
                apiKeys,
            });
            emitLouisEvent({
                type: "workflow.gate.opened",
                userId,
                payload: { workflow_id: body.workflow_id, via: "public-api" },
            });
            ok(res, {
                workflow_id: body.workflow_id,
                model,
                content: text,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : "workflow run failed";
            fail(res, 502, "llm_error", msg);
        }
    },
);

// Convenience root — useful as a liveness/discovery probe for dev tools.
publicApiRouter.get("/", (_req: Request, res: Response) => {
    ok(res, {
        name: "Louis Public API",
        version: "v1",
        docs: "/docs/PUBLIC_API.md",
        auth: {
            mint_token: "POST /api/v1/tokens (requires Supabase session)",
            use_token: "Authorization: Bearer pk_louis_<random>",
        },
        endpoints: [
            "POST /api/v1/tokens",
            "GET /api/v1/tokens",
            "DELETE /api/v1/tokens/:id",
            "POST /api/v1/chat",
            "POST /api/v1/chat/stream",
            "POST /api/v1/documents",
            "GET /api/v1/documents/:id",
            "GET /api/v1/skills",
            "POST /api/v1/skills/run",
            "POST /api/v1/workflows/run",
            "GET /api/v1/events (SSE)",
            "GET /api/v1/plugins",
        ],
    });
});
