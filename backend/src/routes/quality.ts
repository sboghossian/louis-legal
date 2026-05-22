/**
 * Legal-Design quality API (Lavern-inspired).
 *
 * Deterministic, no LLM: runs the quality suite (ethics dark-pattern audit,
 * plain-language readability, and meaning-preservation risk diff) over text the
 * caller provides. Cheap and synchronous — a trust layer that costs no tokens.
 */
import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { runEthicsAudit, scoreReadability, diffRiskFlags } from "../quality";

export const qualityRouter = Router();
qualityRouter.use(requireAuth);

// POST /api/quality/audit { text, original? }
// - text: the document/clause to audit (required)
// - original: optional source text; when present, meaning-preservation risk
//   flags are computed treating `text` as the simplified version of `original`.
qualityRouter.post("/audit", (req, res) => {
  const text = req.body?.text;
  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "text must be a non-empty string" });
    return;
  }
  const original =
    typeof req.body?.original === "string" ? req.body.original : undefined;

  res.json({
    ethics: runEthicsAudit(text),
    readability: scoreReadability(text),
    risk: original ? diffRiskFlags(original, text) : [],
  });
});
