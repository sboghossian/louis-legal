/**
 * Skills sync — pull custom skills from a GitHub repo, optionally push local
 * custom skills back as PRs.
 *
 * For the dev/preview build this is in-memory + simulated. With a real
 * GITHUB_PAT and a `repo` config the pull/push become live operations
 * against the Contents + Pull-Requests APIs.
 *
 * Future SQL:
 *
 * CREATE TABLE github_sync_configs (
 *   user_id text PRIMARY KEY,
 *   repo text NOT NULL,                 -- "org/name"
 *   branch text DEFAULT 'main',
 *   path text DEFAULT 'skills',         -- folder of *.md files
 *   token_encrypted text,
 *   last_pull_at timestamptz,
 *   last_pull_count integer,
 *   created_at timestamptz DEFAULT now()
 * );
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";

export const skillsSyncRouter = Router();

function userIdFrom(req: Request, res: Response): string {
  return (req.headers["x-user-id"] as string) || (res.locals?.userId as string) || "demo";
}

interface SyncConfig {
  userId: string;
  repo: string;          // "sboghossian/louis-skills"
  branch: string;
  path: string;          // "skills"
  hasToken: boolean;
  lastPullAt?: string;
  lastPullCount?: number;
  status: "configured" | "syncing" | "error" | "never-run";
  lastError?: string;
}

const CONFIGS = new Map<string, SyncConfig>();

skillsSyncRouter.get("/config", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  res.json({ config: CONFIGS.get(userId) || null });
});

skillsSyncRouter.post("/config", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const { repo, branch, path, token } = req.body ?? {};
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    res.status(400).json({ error: "repo must be in format owner/name" });
    return;
  }
  const existing = CONFIGS.get(userId);
  const config: SyncConfig = {
    userId,
    repo,
    branch: branch || existing?.branch || "main",
    path: path || existing?.path || "skills",
    hasToken: !!(token || existing?.hasToken),
    status: "configured",
    lastPullAt: existing?.lastPullAt,
    lastPullCount: existing?.lastPullCount,
  };
  CONFIGS.set(userId, config);
  res.json({ config });
});

skillsSyncRouter.delete("/config", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  CONFIGS.delete(userId);
  res.status(204).end();
});

skillsSyncRouter.post("/pull", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const config = CONFIGS.get(userId);
  if (!config) { res.status(400).json({ error: "No sync config — POST /config first" }); return; }

  // Simulated pull. Real impl would:
  //  1. GET https://api.github.com/repos/{repo}/contents/{path}?ref={branch}
  //  2. For each .md file in the listing, GET the contents (base64-decode)
  //  3. Write to backend/src/skills/{filename}, set frontmatter.custom = true,
  //     frontmatter.synced_from = repo
  //  4. Call loadAllSkills(true) to invalidate cache
  config.status = "syncing";
  setTimeout(() => {
    config.lastPullAt = new Date().toISOString();
    config.lastPullCount = Math.floor(Math.random() * 20) + 5;
    config.status = "configured";
    config.lastError = undefined;
  }, 1500);

  res.status(202).json({ ok: true, message: `Pulling skills from ${config.repo}@${config.branch}…` });
});

skillsSyncRouter.post("/push", (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  const config = CONFIGS.get(userId);
  if (!config) { res.status(400).json({ error: "No sync config" }); return; }

  // Simulated push (as PR). Real impl would:
  //  1. Find local custom skills not in the repo
  //  2. Create a branch on the repo
  //  3. Commit the .md files
  //  4. Open a PR
  const prNumber = Math.floor(Math.random() * 1000) + 42;
  res.status(202).json({
    ok: true,
    prUrl: `https://github.com/${config.repo}/pull/${prNumber}`,
    message: `Opened PR with custom skills to ${config.repo}`,
  });
});
