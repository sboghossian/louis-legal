/**
 * Drafting Board persistence — `/api/drafting-boards`.
 *
 * Boards used to live in localStorage only. That meant losing your phone
 * cache wiped a half-finished M&A flow; logging in from a colleague's
 * machine showed nothing. This route mirrors the localStorage shape onto
 * Supabase so boards roam with the user.
 *
 * Auth: requireAuth (Supabase JWT). Scoped per-user-per-templateKey.
 * Payload is the Board JSON the frontend already produces — see
 * frontend/src/app/components/drafting/types.ts.
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";

export const draftingBoardsRouter = Router();

draftingBoardsRouter.use(requireAuth);

interface BoardRow {
  id: string;
  user_id: string;
  template_key: string;
  name: string | null;
  payload: unknown;
  created_at: string;
  updated_at: string;
}

function pickName(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as { name?: unknown };
  return typeof p.name === "string" ? p.name : null;
}

// GET /api/drafting-boards — list this user's boards (id + key + name +
// updated_at). Full payloads are returned via the per-board endpoint to
// keep this listing cheap.
draftingBoardsRouter.get("/", async (_req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { data, error } = await db
    .from("drafting_boards")
    .select("id, template_key, name, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({
    boards: (data ?? []).map((r) => ({
      id: r.id,
      templateKey: r.template_key,
      name: r.name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  });
});

// GET /api/drafting-boards/:templateKey — full payload for a single board.
draftingBoardsRouter.get(
  "/:templateKey",
  async (req: Request, res: Response) => {
    const userId = res.locals.userId as string;
    const { templateKey } = req.params;
    const db = createServerSupabase();
    const { data, error } = await db
      .from("drafting_boards")
      .select("id, template_key, name, payload, created_at, updated_at")
      .eq("user_id", userId)
      .eq("template_key", templateKey)
      .maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Board not found" });
      return;
    }
    const row = data as BoardRow;
    res.json({
      id: row.id,
      templateKey: row.template_key,
      name: row.name,
      payload: row.payload,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  },
);

// POST /api/drafting-boards — upsert a board by (user_id, templateKey).
// The frontend uses this for both first-save and every subsequent dirty
// save, which is why this is a single endpoint and not POST + PUT.
draftingBoardsRouter.post("/", async (req: Request, res: Response) => {
  const userId = res.locals.userId as string;
  const body = (req.body ?? {}) as {
    templateKey?: string;
    name?: string;
    payload?: unknown;
  };
  if (!body.templateKey || typeof body.templateKey !== "string") {
    res.status(400).json({ error: "templateKey required" });
    return;
  }
  if (!body.payload || typeof body.payload !== "object") {
    res.status(400).json({ error: "payload required (Board object)" });
    return;
  }
  const name = body.name ?? pickName(body.payload);
  const db = createServerSupabase();
  const { data, error } = await db
    .from("drafting_boards")
    .upsert(
      {
        user_id: userId,
        template_key: body.templateKey,
        name,
        payload: body.payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,template_key" },
    )
    .select("id, template_key, name, created_at, updated_at")
    .single();
  if (error || !data) {
    res
      .status(500)
      .json({ error: error?.message ?? "failed to upsert board" });
    return;
  }
  const row = data as Omit<BoardRow, "payload">;
  res.status(200).json({
    id: row.id,
    templateKey: row.template_key,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
});

// DELETE /api/drafting-boards/:templateKey — drop a board.
draftingBoardsRouter.delete(
  "/:templateKey",
  async (req: Request, res: Response) => {
    const userId = res.locals.userId as string;
    const { templateKey } = req.params;
    const db = createServerSupabase();
    const { error } = await db
      .from("drafting_boards")
      .delete()
      .eq("user_id", userId)
      .eq("template_key", templateKey);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(204).end();
  },
);
