import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { chatRouter } from "./routes/chat";
import { projectsRouter } from "./routes/projects";
import { projectChatRouter } from "./routes/projectChat";
import { documentsRouter } from "./routes/documents";
import { tabularRouter } from "./routes/tabular";
import { workflowsRouter } from "./routes/workflows";
import { workflowRunsRouter } from "./routes/workflowRuns";
import { agentCardRouter } from "./agent";
import { agentTaskRouter } from "./agent/task";
import { userRouter } from "./routes/user";
import { downloadsRouter } from "./routes/downloads";
import { skillsRouter } from "./routes/skills";
import { customizeRouter } from "./routes/customize";
import { docWorkspaceRouter } from "./routes/docWorkspace";
import { clausesRouter } from "./routes/clauses";
import { calculatorsRouter } from "./routes/calculators";
import { mattersRouter } from "./routes/matters";
import { citationsRouter } from "./routes/citations";
import { riskRouter } from "./routes/risk";
import { legalFlowsRouter } from "./routes/legalFlows";
import { routinesRouter } from "./routes/routines";
import { draftingBoardsRouter } from "./routes/draftingBoards";
import { onboardingRouter } from "./routes/onboarding";
import { apiKeysRouter } from "./routes/apiKeys";
import { integrationsRouter } from "./routes/integrations";
import { teamRouter } from "./routes/team";
import { skillsSyncRouter } from "./routes/skillsSync";
import { mcpRouter } from "./routes/mcp";
import { inboxRouter } from "./routes/inbox";
import { feedbackRouter } from "./routes/feedback";
import { qualityRouter } from "./routes/quality";
import { agentBuilderRouter } from "./routes/agentBuilder";
import { authRouter } from "./routes/auth";
import { publicApiRouter } from "./routes/public-api";
import { eventsRouter } from "./routes/events";
import { pluginsRouter } from "./routes/plugins";

const app = express();
const PORT = process.env.PORT ?? 3001;
const isProduction = process.env.NODE_ENV === "production";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function minutes(value: number): number {
  return value * 60 * 1000;
}

function hours(value: number): number {
  return minutes(value * 60);
}

function makeLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "OPTIONS",
    message: {
      detail:
        options.message ?? "Too many requests. Please try again later.",
    },
  });
}

const generalLimiter = makeLimiter({
  windowMs: minutes(envInt("RATE_LIMIT_GENERAL_WINDOW_MINUTES", 15)),
  max: envInt("RATE_LIMIT_GENERAL_MAX", 300),
});

const chatLimiter = makeLimiter({
  windowMs: minutes(envInt("RATE_LIMIT_CHAT_WINDOW_MINUTES", 15)),
  max: envInt("RATE_LIMIT_CHAT_MAX", 30),
  message: "Too many chat requests. Please try again later.",
});

const chatCreateLimiter = makeLimiter({
  windowMs: minutes(envInt("RATE_LIMIT_CHAT_CREATE_WINDOW_MINUTES", 15)),
  max: envInt("RATE_LIMIT_CHAT_CREATE_MAX", 60),
});

const uploadLimiter = makeLimiter({
  windowMs: hours(envInt("RATE_LIMIT_UPLOAD_WINDOW_HOURS", 1)),
  max: envInt("RATE_LIMIT_UPLOAD_MAX", 50),
  message: "Too many upload requests. Please try again later.",
});

app.disable("x-powered-by");
app.set("trust proxy", envInt("TRUST_PROXY_HOPS", 1));

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: isProduction
      ? {
          maxAge: 15552000,
          includeSubDomains: true,
        }
      : false,
    referrerPolicy: { policy: "no-referrer" },
  }),
);

// FRONTEND_URL may list multiple comma-separated origins so the same
// backend can serve both localhost dev and a public tunneled origin
// (e.g. "http://localhost:3000,https://legal.dashable.dev").
const corsOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  }),
);

app.use(generalLimiter);

app.use(express.json({ limit: "50mb" }));

app.post("/chat", chatLimiter);
app.post("/projects/:projectId/chat", chatLimiter);
app.post("/tabular-review/:reviewId/chat", chatLimiter);
app.post("/tabular-review/:reviewId/generate", chatLimiter);
app.post("/chat/create", chatCreateLimiter);
app.post("/chat/:chatId/generate-title", chatCreateLimiter);
app.post("/single-documents", uploadLimiter);
app.post("/single-documents/:documentId/versions", uploadLimiter);
app.post("/projects/:projectId/documents", uploadLimiter);

app.use("/chat", chatRouter);
app.use("/projects", projectsRouter);
app.use("/projects/:projectId/chat", projectChatRouter);
app.use("/single-documents", documentsRouter);
app.use("/tabular-review", tabularRouter);
app.use("/workflows", workflowsRouter);
app.use("/api/workflows", workflowRunsRouter);
app.use(agentCardRouter); // serves /.well-known/agent.json (Wave 3 agent-native surface)
app.use(agentTaskRouter); // serves POST /.well-known/agent/task (Wave 4 A2A↔MCP bridge)
app.use("/user", userRouter);
app.use("/users", userRouter);
app.use("/download", downloadsRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/customize", customizeRouter);
app.use("/api/doc-workspace", docWorkspaceRouter);
app.use("/api/clauses", clausesRouter);
app.use("/api/calculators", calculatorsRouter);
app.use("/api/matters", mattersRouter);
app.use("/api/citations", citationsRouter);
app.use("/api/risk", riskRouter);
app.use("/api/legal-flows", legalFlowsRouter);
app.use("/api/routines", routinesRouter);
app.use("/api/drafting-boards", draftingBoardsRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/api-keys", apiKeysRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/team", teamRouter);
app.use("/api/skills-sync", skillsSyncRouter);
app.use("/api/mcp", mcpRouter);
app.use("/api/inbox", inboxRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/quality", qualityRouter);
app.use("/api/agent-builder", agentBuilderRouter);

// Auth helpers — service-role signup that bypasses the email-confirm
// gate + Supabase's built-in mailer rate limit. Capped tightly because
// it can create accounts.
const signupLimiter = makeLimiter({
  windowMs: minutes(envInt("RATE_LIMIT_SIGNUP_WINDOW_MINUTES", 10)),
  max: envInt("RATE_LIMIT_SIGNUP_MAX", 5),
  message: "Too many signup attempts. Please try again later.",
});
app.use("/api/auth/signup", signupLimiter);
app.use("/api/auth", authRouter);

// Public developer platform — versioned, token-authenticated REST surface
// for firm devs. Mounted after the internal routes so it can never shadow
// them. The `/api/v1/events` SSE stream and `/api/v1/plugins` marketplace
// share the same `pk_louis_…` auth model (see routes/public-api.ts).
app.use("/api/v1", publicApiRouter);
app.use("/api/v1/events", eventsRouter);
app.use("/api/v1/plugins", pluginsRouter);

/**
 * Liveness probe — answer fast, never block on external services.
 * Used by Docker HEALTHCHECK + Kubernetes liveness probes.
 */
app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

/**
 * Readiness probe — checks every subsystem and reports per-component.
 * Used by deployment systems that want to gate traffic until the
 * backend can actually answer requests. Returns 200 if everything is
 * green, 503 if any required subsystem fails. Optional subsystems
 * (e.g. Cohere, Redis) report `degraded` without flipping the 503.
 */
app.get("/health/ready", async (_req, res) => {
  const checks: Record<string, { status: "ok" | "degraded" | "down"; ms?: number; detail?: string }> = {};

  // Supabase (required)
  const t0 = Date.now();
  try {
    const { createServerSupabase } = await import("./lib/supabase");
    const db = createServerSupabase();
    const { error } = await db.from("_migrations").select("id").limit(1);
    checks.supabase = error
      ? { status: "down", ms: Date.now() - t0, detail: error.message }
      : { status: "ok", ms: Date.now() - t0 };
  } catch (e) {
    checks.supabase = { status: "down", ms: Date.now() - t0, detail: (e as Error).message };
  }

  // BullMQ / Redis (optional — degraded if absent or unreachable)
  const t1 = Date.now();
  try {
    const { getRedisUrl } = await import("./queue/index");
    const url = getRedisUrl();
    if (!process.env.REDIS_URL) {
      checks.queue = { status: "degraded", detail: "REDIS_URL not set (queues are no-op)" };
    } else {
      // Probe with a tiny TCP connect attempt via ioredis. Lazy-import so
      // boot doesn't pull ioredis when Redis isn't configured.
      const ioredis = (await import("ioredis")).default;
      const probe = new ioredis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 1500,
        enableOfflineQueue: false,
      });
      try {
        await probe.connect();
        await probe.ping();
        checks.queue = { status: "ok", ms: Date.now() - t1 };
      } finally {
        probe.disconnect();
      }
    }
  } catch (e) {
    checks.queue = { status: "degraded", ms: Date.now() - t1, detail: (e as Error).message };
  }

  // Cohere (optional)
  checks.cohere = process.env.COHERE_API_KEY
    ? { status: "ok", detail: "key present (not pinged)" }
    : { status: "degraded", detail: "no COHERE_API_KEY — retrieval falls back" };

  // Storage (R2 / S3 — optional in dev)
  try {
    const { storageEnabled } = await import("./lib/storage");
    checks.storage = storageEnabled
      ? { status: "ok", detail: "configured" }
      : { status: "degraded", detail: "storage not configured (uploads will fail)" };
  } catch (e) {
    checks.storage = { status: "degraded", detail: (e as Error).message };
  }

  const required = ["supabase"];
  const failed = required.filter((k) => checks[k]?.status === "down");
  const ready = failed.length === 0;

  res.status(ready ? 200 : 503).json({
    ready,
    failed,
    checks,
    uptime: process.uptime(),
  });
});

app.listen(PORT, () => {
  console.log(`Louis backend running on port ${PORT}`);
});
