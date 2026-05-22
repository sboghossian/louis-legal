/**
 * Agent-builder API (Lavern-inspired firm onboarding).
 *
 * POST /api/agent-builder/analyze { url } — scrapes a firm's public website
 * (SSRF-hardened) and turns it into proposed AI agent profiles, each carrying a
 * `seenOnSite` citation so hallucinated roles don't slip through. The "paste
 * your firm URL → get your AI legal team" magic moment.
 *
 * Mounted at /api/agent-builder (not /api/onboarding, which is the existing
 * 10-question onboarding flow).
 */
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";
import { getUserApiKeys } from "../lib/userSettings";
import { completeText } from "../lib/llm";
import { DEFAULT_MAIN_MODEL } from "../lib/llm/models";
import { scrapeFirmSite, analyzeFirm, type LlmFn } from "../onboarding";

export const agentBuilderRouter = Router();
agentBuilderRouter.use(requireAuth);

agentBuilderRouter.post("/analyze", async (req, res) => {
  const userId = res.locals.userId as string;
  const url = req.body?.url;
  if (typeof url !== "string" || !/^https:\/\//i.test(url.trim())) {
    res.status(400).json({ error: "url must be an https:// URL" });
    return;
  }

  try {
    const scraped = await scrapeFirmSite(url.trim());
    const db = createServerSupabase();
    const apiKeys = await getUserApiKeys(userId, db);
    const llm: LlmFn = (prompt: string) =>
      completeText({ model: DEFAULT_MAIN_MODEL, user: prompt, apiKeys });
    const profiles = await analyzeFirm(scraped, llm);
    res.json({ profiles });
  } catch (err) {
    res
      .status(502)
      .json({ error: err instanceof Error ? err.message : "firm analysis failed" });
  }
});
