import { Router, Request, Response } from "express";
import { formatCitation, formatAll, detectStyle, CitationStyle } from "../citations/_engine";

export const citationsRouter = Router();

const ALL_STYLES: CitationStyle[] = ["bluebook", "oscola", "difc", "adgm", "ksa-gazette", "uae-federal", "lb-gazette", "fr-dalloz", "eu-ecli"];

citationsRouter.get("/styles", (_req: Request, res: Response) => {
  res.json({
    styles: ALL_STYLES.map(s => ({
      code: s,
      name: STYLE_NAMES[s] || s,
      description: STYLE_DESCRIPTIONS[s] || "",
    })),
  });
});

citationsRouter.post("/format", (req: Request, res: Response) => {
  const { input, style, styles } = req.body ?? {};
  if (!input) {
    res.status(400).json({ error: "input required" });
    return;
  }
  if (Array.isArray(styles)) {
    const results = formatAll(input, styles as CitationStyle[]);
    res.json({ results });
    return;
  }
  if (!style) {
    res.status(400).json({ error: "style or styles array required" });
    return;
  }
  try {
    const result = formatCitation(input, style);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

citationsRouter.post("/format-all", (req: Request, res: Response) => {
  const { input } = req.body ?? {};
  if (!input) {
    res.status(400).json({ error: "input required" });
    return;
  }
  const results = formatAll(input, ALL_STYLES);
  res.json({ results });
});

citationsRouter.post("/detect", (req: Request, res: Response) => {
  const { raw } = req.body ?? {};
  if (!raw || typeof raw !== "string") {
    res.status(400).json({ error: "raw string required" });
    return;
  }
  const style = detectStyle(raw);
  res.json({ detected: style, raw });
});

const STYLE_NAMES: Record<CitationStyle, string> = {
  "bluebook": "Bluebook (US)",
  "oscola": "OSCOLA (UK)",
  "difc": "DIFC Practice Direction",
  "adgm": "ADGM Citation Style",
  "ksa-gazette": "KSA Official Gazette",
  "uae-federal": "UAE Federal Gazette",
  "lb-gazette": "Lebanon Gazette",
  "fr-dalloz": "French (Dalloz)",
  "eu-ecli": "EU ECLI",
};

const STYLE_DESCRIPTIONS: Record<CitationStyle, string> = {
  "bluebook": "Standard US legal citation. Used in US courts and US law schools.",
  "oscola": "Oxford Standard for Citation of Legal Authorities. UK / Commonwealth.",
  "difc": "Dubai International Financial Centre Courts citation style.",
  "adgm": "Abu Dhabi Global Market Courts citation style.",
  "ksa-gazette": "Saudi Arabia: Royal Decree + Article references via Bureau of Experts.",
  "uae-federal": "UAE Federal Decree-Law and Federal Law references.",
  "lb-gazette": "Lebanon: Lois + Cassation decisions.",
  "fr-dalloz": "French: Dalloz style for jurisprudence and codes.",
  "eu-ecli": "European Case-Law Identifier (ECLI) for CJEU and Member State courts.",
};
