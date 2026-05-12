import { Router } from "express";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { loadAllSkills, getSkill, listSkills, composeSystemPrompt } from "../skills/_loader";
import { getRecentDecisions, decisionStats } from "../skills/_observability";
import { route as routeSkillsSync, routeAsync as routeSkillsAsync } from "../skills/_router";

export const skillsRouter = Router();

/**
 * GET /api/skills
 * Query params:
 *   - category?: filter by category
 *   - status?: drafted | reviewed | shipped | stub
 *   - priority?: P0 | P1 | P2 | P3
 *   - q?: free-text search across id and name
 */
skillsRouter.get("/", (req, res) => {
  const { category, status, priority, q } = req.query as Record<string, string | undefined>;
  let entries = listSkills();
  if (category) entries = entries.filter(e => e.category === category);
  if (status) entries = entries.filter(e => e.status === status);
  if (priority) entries = entries.filter(e => e.priority === priority);
  if (q) {
    const needle = q.toLowerCase();
    entries = entries.filter(e =>
      e.id.toLowerCase().includes(needle) ||
      e.name.toLowerCase().includes(needle)
    );
  }
  res.json({ total: entries.length, entries });
});

/**
 * GET /api/skills/registry
 * Returns the prebuilt registry JSON if available, else regenerates from filesystem.
 */
skillsRouter.get("/registry", (_req, res) => {
  const registryPath = join(__dirname, "..", "skills", "_REGISTRY.json");
  if (existsSync(registryPath)) {
    res.json(JSON.parse(readFileSync(registryPath, "utf-8")));
    return;
  }
  const entries = listSkills();
  res.json({ generated_at: new Date().toISOString(), total: entries.length, entries });
});

/**
 * GET /api/skills/route-debug
 * Returns the in-memory ring buffer of recent router decisions.
 * Query: ?limit=50
 *
 * NOTE: must be declared BEFORE the /:id route below, or Express matches "route-debug" as a skill id.
 */
skillsRouter.get("/route-debug", (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || "50"), 200);
  const decisions = getRecentDecisions(limit);
  res.json({
    stats: decisionStats(),
    decisions,
  });
});

/**
 * POST /api/skills/compose
 * Body: { skillIds: string[] }
 * Returns: { systemPrompt: string }
 *
 * For previewing what the composed system prompt looks like for a given combination.
 */
skillsRouter.post("/compose", (req, res) => {
  const body = req.body as { skillIds?: string[] };
  if (!body.skillIds || !Array.isArray(body.skillIds)) {
    res.status(400).json({ error: "skillIds_required" });
    return;
  }
  const systemPrompt = composeSystemPrompt(body.skillIds);
  res.json({ systemPrompt, count: body.skillIds.length });
});

/**
 * GET /api/skills/:id
 * Returns full skill with prompt body.
 * NOTE: this catch-all route must be LAST so it doesn't shadow /route-debug, /registry, /compose, /route-test.
 */
skillsRouter.get("/:id", (req, res) => {
  const skill = getSkill(req.params.id);
  if (!skill) {
    res.status(404).json({ error: "not_found", id: req.params.id });
    return;
  }
  res.json(skill);
});

/**
 * POST /api/skills/route-test
 * Body: { message: string, persona?: string, useLLM?: boolean }
 * Returns the routing decision for an arbitrary message — useful for /skills UI testing.
 */
skillsRouter.post("/route-test", async (req, res) => {
  const body = req.body as { message?: string; persona?: string; useLLM?: boolean };
  if (!body.message || typeof body.message !== "string") {
    res.status(400).json({ error: "message_required" });
    return;
  }
  const ctx = {
    message: body.message,
    persona: (body.persona as "louis-twin" | "partner" | "associate" | "junior" | "in-house-counsel") ?? "associate",
    surface: "web" as const,
    hasDocuments: false,
  };
  const decision = body.useLLM === false
    ? routeSkillsSync(ctx)
    : await routeSkillsAsync(ctx);
  res.json(decision);
});

// Preload skills at boot
loadAllSkills();
