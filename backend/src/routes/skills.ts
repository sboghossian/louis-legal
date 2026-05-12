import { Router } from "express";
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { loadAllSkills, getSkill, listSkills, composeSystemPrompt } from "../skills/_loader";
import { getRecentDecisions, decisionStats } from "../skills/_observability";
import { route as routeSkillsSync, routeAsync as routeSkillsAsync } from "../skills/_router";

const SKILLS_DIR = join(__dirname, "..", "skills");
const ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{1,80}$/;

function buildSkillMarkdown(input: {
  id: string;
  name: string;
  category: string;
  intent?: string[];
  jurisdictions?: string[];
  practice_area?: string;
  priority?: string;
  status?: string;
  version?: string;
  body: string;
}): string {
  const lines: string[] = ["---"];
  lines.push(`id: ${input.id}`);
  lines.push(`name: '${(input.name || input.id).replace(/'/g, "''")}'`);
  lines.push(`category: ${input.category || "custom"}`);
  if (input.intent && input.intent.length) lines.push(`intent: [${input.intent.join(", ")}]`);
  if (input.jurisdictions && input.jurisdictions.length) lines.push(`jurisdictions: [${input.jurisdictions.join(", ")}]`);
  if (input.practice_area) lines.push(`practice_area: ${input.practice_area}`);
  lines.push(`priority: ${input.priority || "P3"}`);
  lines.push(`status: ${input.status || "drafted"}`);
  lines.push(`version: ${input.version || "0.1"}`);
  lines.push(`custom: true`);
  lines.push("---");
  lines.push("");
  return lines.join("\n") + input.body + (input.body.endsWith("\n") ? "" : "\n");
}

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

/**
 * POST /api/skills
 * Create a custom skill. Writes the .md file + reloads cache.
 */
skillsRouter.post("/", (req, res) => {
  const body = req.body as {
    id?: string;
    name?: string;
    category?: string;
    intent?: string[];
    jurisdictions?: string[];
    practice_area?: string;
    priority?: string;
    status?: string;
    body?: string;
  };
  if (!body.id || !ID_PATTERN.test(body.id)) {
    res.status(400).json({ error: "invalid id (must match /^[a-zA-Z][a-zA-Z0-9._-]{1,80}$/)" });
    return;
  }
  if (!body.body || typeof body.body !== "string" || !body.body.trim()) {
    res.status(400).json({ error: "body required" });
    return;
  }
  const filePath = join(SKILLS_DIR, `${body.id}.md`);
  if (existsSync(filePath)) {
    res.status(409).json({ error: "skill id already exists" });
    return;
  }
  const md = buildSkillMarkdown({
    id: body.id,
    name: body.name || body.id,
    category: body.category || "custom",
    intent: body.intent,
    jurisdictions: body.jurisdictions,
    practice_area: body.practice_area,
    priority: body.priority,
    status: body.status,
    body: body.body,
  });
  writeFileSync(filePath, md, "utf-8");
  loadAllSkills(true); // invalidate cache
  const skill = getSkill(body.id);
  res.status(201).json(skill);
});

/**
 * PUT /api/skills/:id
 * Update an existing skill. Only allowed on user-created skills (custom: true)
 * OR skills passed `?force=true` query (admin override).
 */
skillsRouter.put("/:id", (req, res) => {
  const id = req.params.id;
  const existing = getSkill(id);
  if (!existing) { res.status(404).json({ error: "not_found" }); return; }
  const force = req.query.force === "true";
  const isCustom = !!(existing.frontmatter as unknown as Record<string, unknown>).custom;
  if (!isCustom && !force) {
    res.status(403).json({ error: "skill is read-only (not a custom skill). Append ?force=true to override." });
    return;
  }
  const body = req.body as {
    name?: string;
    category?: string;
    intent?: string[];
    jurisdictions?: string[];
    practice_area?: string;
    priority?: string;
    status?: string;
    body?: string;
  };
  const fm = existing.frontmatter as unknown as Record<string, unknown>;
  const md = buildSkillMarkdown({
    id,
    name: body.name || (fm.name as string) || id,
    category: body.category || (fm.category as string) || "custom",
    intent: body.intent || (fm.intent as string[] | undefined),
    jurisdictions: body.jurisdictions || (fm.jurisdictions as string[] | undefined),
    practice_area: body.practice_area || (fm.practice_area as string | undefined),
    priority: body.priority || (fm.priority as string | undefined),
    status: body.status || (fm.status as string | undefined),
    body: body.body ?? existing.prompt,
  });
  writeFileSync(existing.path, md, "utf-8");
  loadAllSkills(true);
  res.json(getSkill(id));
});

/**
 * DELETE /api/skills/:id
 * Removes a custom skill file. Built-in skills cannot be deleted.
 */
skillsRouter.delete("/:id", (req, res) => {
  const id = req.params.id;
  const existing = getSkill(id);
  if (!existing) { res.status(404).json({ error: "not_found" }); return; }
  const isCustom = !!(existing.frontmatter as unknown as Record<string, unknown>).custom;
  if (!isCustom) {
    res.status(403).json({ error: "built-in skill cannot be deleted" });
    return;
  }
  unlinkSync(existing.path);
  loadAllSkills(true);
  res.status(204).end();
});

// Preload skills at boot
loadAllSkills();
