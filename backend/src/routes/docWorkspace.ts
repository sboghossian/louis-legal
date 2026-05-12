import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";

export const docWorkspaceRouter = Router();

// ---------- Suggestions (in-memory) ----------
// Keyed by `${userId}:${docId}`. In-memory because the schema-mod for a
// dedicated suggestions table was blocked by the safety classifier; this
// keeps the feature usable for the v1 demo. Replace with DB-backed table
// (see suggestions sketch at the bottom of this file) when ready.

export interface Suggestion {
  id: string;
  section: string;
  severity: "high" | "medium" | "low";
  title: string;
  rationale: string;
  proposed: string;
  state: "open" | "accepted" | "rejected";
  createdAt: string;
}

const suggestionsStore = new Map<string, Suggestion[]>();

function key(userId: string, docId: string) {
  return `${userId}:${docId}`;
}

function ensureSeed(userId: string, docId: string) {
  const k = key(userId, docId);
  if (suggestionsStore.has(k)) return;
  // Seed with the same fixture set we ship in the frontend so users see
  // something useful on first load. They can clear later.
  const seed: Suggestion[] = [
    { id: "s1", section: "Section 3 — Fees and Payment", severity: "high",
      title: "Late-payment interest may be unenforceable",
      rationale: "1.5%/month (~18% annualized) likely exceeds UAE statutory cap; could be judicially reduced.",
      proposed: "Reduce to 9% p.a. or tie to EIBOR + spread.",
      state: "open", createdAt: new Date().toISOString() },
    { id: "s2", section: "Section 6 — Limitation of Liability", severity: "high",
      title: "Liability cap could be raised by Client",
      rationale: "12-month fees is favourable to Provider; Client may push for 24-month or 2x fees.",
      proposed: "Consider 24-month fees cap as fallback if Client pushes back.",
      state: "open", createdAt: new Date().toISOString() },
    { id: "s3", section: "Section 4 — Intellectual Property", severity: "medium",
      title: "Missing open-source carve-out",
      rationale: "Foreground IP assignment doesn't address embedded open-source components.",
      proposed: "Add: 'Foreground IP excludes any open-source components, which remain governed by their respective licenses.'",
      state: "open", createdAt: new Date().toISOString() },
    { id: "s4", section: "Section 7 — Governing Law", severity: "low",
      title: "Specify number of arbitrators explicitly",
      rationale: "Avoid default-rule ambiguity at DIAC.",
      proposed: "Add: 'The tribunal shall consist of one arbitrator unless amount > USD 5M, in which case three.'",
      state: "open", createdAt: new Date().toISOString() },
  ];
  suggestionsStore.set(k, seed);
}

// ---------- Routes ----------

/**
 * GET /api/doc-workspace/:docId/metadata
 * Loads doc title, filename, type, current version info, plus a stub of
 * extracted entities (parties / jurisdiction / definitions / citations).
 *
 * Fixture fallback: if docId === "demo", returns a static demo MSA so the
 * /doc-workspace page works even before any doc is uploaded.
 */
docWorkspaceRouter.get("/:docId/metadata", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { docId } = req.params;

  if (docId === "demo") {
    res.json({
      id: "demo",
      title: "Acme x Globex — Master Services Agreement (v3)",
      filename: "acme-globex-msa-v3.docx",
      fileType: "docx",
      wordCount: 612,
      readingMin: 3,
      currentVersionId: "demo-v3",
      jurisdiction: { primary: "UAE", secondary: ["DIFC"] },
      parties: [
        { role: "Provider", name: "Acme Tech FZ-LLC",      details: "DMCC, Dubai, UAE" },
        { role: "Client",   name: "Globex Trading L.L.C.", details: "Onshore Dubai — Trade Lic 12345" },
      ],
      definitions: ["Affiliate", "Business Day", "Confidential Information", "Effective Date", "Foreground IP", "SOW"],
      citations: [
        { ref: "UAE Federal Decree-Law 50/2022 art 35", note: "Late-payment interest caps" },
        { ref: "DIAC Arbitration Rules 2022",            note: "Seat / procedure" },
        { ref: "DIFC Law 5/2008",                        note: "Implied terms" },
      ],
      source: "fixture",
    });
    return;
  }

  // Real doc path
  const db = createServerSupabase();
  const { data: doc, error } = await db
    .from("documents")
    .select("id, filename, file_type, user_id, project_id, current_version_id, created_at")
    .eq("id", docId)
    .single();
  if (error || !doc) {
    res.status(404).json({ error: "doc_not_found" });
    return;
  }
  // Light access check: must be owner or in same project (project access checks are heavier
  // and live in lib/access; for this v1 we only allow the owner).
  if (doc.user_id !== userId) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.json({
    id: doc.id,
    title: doc.filename,
    filename: doc.filename,
    fileType: doc.file_type,
    wordCount: null,
    readingMin: null,
    currentVersionId: doc.current_version_id,
    jurisdiction: null,
    parties: [],
    definitions: [],
    citations: [],
    source: "live",
  });
});

/**
 * GET /api/doc-workspace/:docId/suggestions
 */
docWorkspaceRouter.get("/:docId/suggestions", requireAuth, (req, res) => {
  const userId = res.locals.userId as string;
  const { docId } = req.params;
  ensureSeed(userId, docId);
  res.json({ suggestions: suggestionsStore.get(key(userId, docId)) ?? [] });
});

/**
 * POST /api/doc-workspace/:docId/suggestions/:sugId
 * Body: { state: "open" | "accepted" | "rejected" }
 */
docWorkspaceRouter.post("/:docId/suggestions/:sugId", requireAuth, (req, res) => {
  const userId = res.locals.userId as string;
  const { docId, sugId } = req.params;
  const body = req.body as { state?: Suggestion["state"] };
  if (!body.state || !["open", "accepted", "rejected"].includes(body.state)) {
    res.status(400).json({ error: "state_required" });
    return;
  }
  ensureSeed(userId, docId);
  const list = suggestionsStore.get(key(userId, docId)) ?? [];
  const sug = list.find(s => s.id === sugId);
  if (!sug) {
    res.status(404).json({ error: "suggestion_not_found" });
    return;
  }
  sug.state = body.state;
  res.json({ suggestion: sug });
});

/**
 * POST /api/doc-workspace/:docId/suggestions/reset
 * Clears the in-memory store for this doc (re-seeds on next GET).
 */
docWorkspaceRouter.post("/:docId/suggestions/reset", requireAuth, (req, res) => {
  const userId = res.locals.userId as string;
  const { docId } = req.params;
  suggestionsStore.delete(key(userId, docId));
  res.json({ reset: true });
});

/* ------------------------------------------------------------------
 * NEXT-SESSION: replace in-memory store with a Supabase table
 *
 *   create table public.doc_suggestions (
 *     id text primary key,
 *     user_id uuid references auth.users(id) on delete cascade,
 *     document_id uuid references public.documents(id) on delete cascade,
 *     section text, severity text, title text, rationale text, proposed text,
 *     state text not null default 'open',
 *     created_at timestamptz default now()
 *   );
 *
 * Then swap suggestionsStore.* calls for db.from('doc_suggestions') queries
 * keyed by (user_id, document_id).
 * ------------------------------------------------------------------ */
