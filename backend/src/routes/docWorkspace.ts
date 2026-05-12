import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";
import { downloadFile } from "../lib/storage";
import { extractPdfText, loadActiveVersion } from "../lib/chatTools";

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

export interface DocComment {
  id: string;
  author: string;
  role: string;
  text: string;
  createdAt: string;
}

const commentsStore = new Map<string, DocComment[]>();

function key(userId: string, docId: string) {
  return `${userId}:${docId}`;
}

function ensureCommentSeed(userId: string, docId: string) {
  const k = key(userId, docId);
  if (commentsStore.has(k)) return;
  const seed: DocComment[] = [
    { id: "c1", author: "Lazar",  role: "Partner",   text: "Push on 24-month liability cap — Acme has leverage here.",          createdAt: new Date(Date.now() - 2 * 3600e3).toISOString() },
    { id: "c2", author: "Rawad",  role: "Associate", text: "Confirmed: client wants UAE seat. ADGM is dealbreaker.",            createdAt: new Date(Date.now() - 5 * 3600e3).toISOString() },
    { id: "c3", author: "You",    role: "—",         text: "Will tighten Section 4 IP language.",                                createdAt: new Date(Date.now() - 86400e3).toISOString() },
  ];
  commentsStore.set(k, seed);
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

/**
 * GET /api/doc-workspace/:docId/content
 * Returns plain text content of the doc (extracted from DOCX/PDF) split into
 * paragraph blocks. For docId === "demo" returns the fixture clauses.
 *
 * Optional query: ?versionId=<uuid> — fetch a specific version (for compare mode).
 */
docWorkspaceRouter.get("/:docId/content", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { docId } = req.params;
  const versionId = typeof req.query.versionId === "string" ? req.query.versionId : null;

  if (docId === "demo") {
    // Demo: return either current (v3) or a slightly different v2 for diff demo
    if (versionId === "v2") {
      res.json({
        blocks: [
          { id: "b1", heading: "1. Definitions", text: "In this Agreement, 'Affiliate' means any entity controlling, controlled by, or under common control with a Party; 'Business Day' means any day other than Friday or Saturday." },
          { id: "b2", heading: "2. Services", text: "Provider shall perform the services described in each SOW signed under this MSA." },
          { id: "b3", heading: "3. Fees and Payment", text: "Client shall pay Provider the fees set forth in each SOW. Invoices are due 45 days from receipt. Late payments accrue interest at the maximum rate permitted by law." },
          { id: "b4", heading: "4. Intellectual Property", text: "Provider retains all rights to pre-existing IP. All IP developed under any SOW belongs to Provider." },
          { id: "b5", heading: "5. Confidentiality", text: "Each Party shall hold the other's Confidential Information in strict confidence." },
          { id: "b6", heading: "6. Limitation of Liability", text: "PROVIDER'S LIABILITY SHALL NOT EXCEED THE FEES PAID IN THE TWENTY-FOUR (24) MONTHS PRECEDING THE CLAIM." },
          { id: "b7", heading: "7. Governing Law and Dispute Resolution", text: "This Agreement is governed by English law. Disputes shall be resolved in the courts of England and Wales." },
        ],
        source: "fixture",
        versionId: "v2",
      });
      return;
    }
    res.json({
      blocks: [
        { id: "b1", heading: "1. Definitions", text: "In this Agreement, the following terms shall have the meanings ascribed: 'Affiliate' means any entity controlling, controlled by, or under common control with a Party; 'Business Day' means any day other than Friday or Saturday on which banks in the United Arab Emirates are open." },
        { id: "b2", heading: "2. Services", text: "Provider shall perform the services described in each SOW signed under this MSA. Services shall be performed in a professional and workmanlike manner consistent with industry standards." },
        { id: "b3", heading: "3. Fees and Payment", text: "Client shall pay Provider the fees set forth in each SOW. Invoices are due 30 days from receipt. Late payments accrue interest at the lesser of 1.5% per month or the maximum rate permitted by law.", changed: true },
        { id: "b4", heading: "4. Intellectual Property", text: "Provider retains all right, title, and interest in pre-existing IP. Foreground IP developed under any SOW is assigned to Client upon full payment, subject to a perpetual, royalty-free license back to Provider for internal use." },
        { id: "b5", heading: "5. Confidentiality", text: "Each Party shall hold the other's Confidential Information in strict confidence and not disclose to any third party except on a need-to-know basis to Affiliates and professional advisors bound by confidentiality obligations." },
        { id: "b6", heading: "6. Limitation of Liability", text: "EACH PARTY'S TOTAL CUMULATIVE LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE FEES PAID OR PAYABLE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, EXCEPT FOR (I) BREACH OF CONFIDENTIALITY, (II) IP INDEMNIFICATION, (III) WILLFUL MISCONDUCT OR FRAUD.", changed: true },
        { id: "b7", heading: "7. Governing Law and Dispute Resolution", text: "This Agreement is governed by the laws of the Emirate of Dubai and applicable UAE federal laws. Disputes shall be resolved by binding arbitration under the DIAC Arbitration Rules, seat Dubai (DIFC), in English." },
      ],
      source: "fixture",
      versionId: "v3",
    });
    return;
  }

  // Real-doc path
  const db = createServerSupabase();
  const { data: doc } = await db
    .from("documents")
    .select("id, filename, file_type, user_id")
    .eq("id", docId).single();
  if (!doc || doc.user_id !== userId) {
    res.status(404).json({ error: "doc_not_found" });
    return;
  }

  try {
    let active = await loadActiveVersion(docId, db, versionId);
    if (!active) {
      // Fallback to current
      active = await loadActiveVersion(docId, db);
    }
    if (!active) {
      res.json({ blocks: [], source: "live-empty" });
      return;
    }
    const raw = await downloadFile(active.storage_path);
    if (!raw) {
      res.json({ blocks: [], source: "live-missing" });
      return;
    }
    let text = "";
    const ftype = (doc.file_type || "").toLowerCase();
    if (ftype === "pdf") {
      text = await extractPdfText(raw);
    } else if (ftype === "docx" || ftype === "doc") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(raw) });
      text = result.value;
    } else {
      // best effort: utf-8 decode
      text = Buffer.from(raw).toString("utf-8");
    }

    // Split into paragraph-blocks; detect headings by leading "N." or "Article" or ALL-CAPS short lines.
    const blocks: { id: string; heading?: string; text: string }[] = [];
    const paragraphs = text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    let i = 0;
    for (const p of paragraphs) {
      const headingMatch = p.match(/^(\d+(?:\.\d+)*\.?\s+[^\n]{1,80}|Article\s+\d+[^\n]{0,80}|[A-Z][A-Z\s]{4,40})$/);
      if (headingMatch && p.length < 120) {
        blocks.push({ id: `b${i++}`, heading: p });
      } else {
        // If previous block has a heading but no text yet, attach
        if (blocks.length && !("text" in blocks[blocks.length - 1])) {
          blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], text: p };
        } else {
          blocks.push({ id: `b${i++}`, text: p });
        }
      }
    }
    res.json({ blocks, source: "live", filename: doc.filename });
  } catch (e) {
    res.status(500).json({ error: "extract_failed", detail: (e as Error).message });
  }
});

/**
 * GET /api/doc-workspace/:docId/versions
 * Returns the document_versions list for this doc.
 */
docWorkspaceRouter.get("/:docId/versions", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const { docId } = req.params;

  if (docId === "demo") {
    res.json({
      versions: [
        { id: "v3", versionNumber: 3, displayName: "v3 (current)",  source: "user_upload",     createdAt: new Date().toISOString(),                            summary: "Tightened liability cap; added carve-outs." },
        { id: "v2", versionNumber: 2, displayName: "v2",            source: "assistant_edit",  createdAt: new Date(Date.now() - 86400e3).toISOString(),         summary: "Counterparty broadened indemnity scope." },
        { id: "v1", versionNumber: 1, displayName: "v1 (initial)",  source: "upload",          createdAt: new Date(Date.now() - 7 * 86400e3).toISOString(),     summary: "First draft from MSA template." },
      ],
    });
    return;
  }

  const db = createServerSupabase();
  const { data: doc } = await db.from("documents").select("user_id").eq("id", docId).single();
  if (!doc || doc.user_id !== userId) { res.status(404).json({ error: "doc_not_found" }); return; }

  const { data: rows, error } = await db
    .from("document_versions")
    .select("id, version_number, display_name, source, created_at")
    .eq("document_id", docId)
    .order("created_at", { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({
    versions: (rows ?? []).map(r => ({
      id: r.id,
      versionNumber: r.version_number,
      displayName: r.display_name ?? `v${r.version_number ?? "?"}`,
      source: r.source,
      createdAt: r.created_at,
      summary: r.source === "assistant_edit" ? "AI edits" : r.source === "user_upload" ? "User upload" : null,
    })),
  });
});

/**
 * GET /api/doc-workspace/:docId/comments
 */
docWorkspaceRouter.get("/:docId/comments", requireAuth, (req, res) => {
  const userId = res.locals.userId as string;
  const { docId } = req.params;
  ensureCommentSeed(userId, docId);
  res.json({ comments: commentsStore.get(key(userId, docId)) ?? [] });
});

/**
 * POST /api/doc-workspace/:docId/comments
 * Body: { text: string, author?: string, role?: string }
 */
docWorkspaceRouter.post("/:docId/comments", requireAuth, (req, res) => {
  const userId = res.locals.userId as string;
  const { docId } = req.params;
  const body = req.body as { text?: string; author?: string; role?: string };
  if (!body.text || typeof body.text !== "string") {
    res.status(400).json({ error: "text_required" });
    return;
  }
  ensureCommentSeed(userId, docId);
  const k = key(userId, docId);
  const list = commentsStore.get(k) ?? [];
  const comment: DocComment = {
    id: `c${Date.now()}`,
    author: body.author || (res.locals.userEmail as string)?.split("@")[0] || "You",
    role: body.role || "—",
    text: body.text,
    createdAt: new Date().toISOString(),
  };
  list.unshift(comment);
  commentsStore.set(k, list);
  res.json({ comment });
});

/**
 * DELETE /api/doc-workspace/:docId/comments/:commentId
 */
docWorkspaceRouter.delete("/:docId/comments/:commentId", requireAuth, (req, res) => {
  const userId = res.locals.userId as string;
  const { docId, commentId } = req.params;
  const k = key(userId, docId);
  const list = commentsStore.get(k) ?? [];
  commentsStore.set(k, list.filter(c => c.id !== commentId));
  res.json({ deleted: true });
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
