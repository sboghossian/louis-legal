import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { CLAUSES, searchClauses, getClause, listCategories, listJurisdictions } from "../clauses/_data";

export const clausesRouter = Router();

clausesRouter.use(requireAuth);

clausesRouter.get("/", (req, res) => {
  const { category, jurisdiction, language, position, q } = req.query as Record<string, string | undefined>;
  const results = searchClauses({ category, jurisdiction, language, position, q });
  res.json({
    total: results.length,
    results: results.map(c => ({
      id: c.id,
      title: c.title,
      category: c.category,
      jurisdictions: c.jurisdictions,
      language: c.language,
      position: c.position,
      tags: c.tags,
    })),
  });
});

clausesRouter.get("/meta", (_req, res) => {
  res.json({
    total: CLAUSES.length,
    categories: listCategories(),
    jurisdictions: listJurisdictions(),
  });
});

clausesRouter.get("/:id", (req, res) => {
  const clause = getClause(req.params.id);
  if (!clause) {
    res.status(404).json({ error: "Clause not found" });
    return;
  }
  res.json(clause);
});
