import { Router } from "express";
import { computeEOS, EosInput } from "../calculators/eos";

export const calculatorsRouter = Router();

calculatorsRouter.post("/eos", (req, res) => {
  const body = req.body as Partial<EosInput>;

  // Validation
  const allowedJurisdictions = ["UAE", "KSA", "BH", "QA", "OM", "KW"] as const;
  if (!body.jurisdiction || !allowedJurisdictions.includes(body.jurisdiction)) {
    res.status(400).json({ error: `jurisdiction must be one of: ${allowedJurisdictions.join(", ")}` });
    return;
  }
  if (typeof body.basicSalaryMonthly !== "number" || body.basicSalaryMonthly <= 0) {
    res.status(400).json({ error: "basicSalaryMonthly must be a positive number" });
    return;
  }
  if (typeof body.serviceDays !== "number" || body.serviceDays < 0) {
    res.status(400).json({ error: "serviceDays must be a non-negative number" });
    return;
  }

  try {
    const result = computeEOS(body as EosInput);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

calculatorsRouter.get("/eos/info", (_req, res) => {
  res.json({
    jurisdictions: [
      { code: "UAE", name: "United Arab Emirates", currency: "AED", citations: ["FDL 33/2021 Art. 51", "Cabinet Resolution 1/2022"] },
      { code: "KSA", name: "Kingdom of Saudi Arabia", currency: "SAR", citations: ["Labor Law Art. 84-87"] },
      { code: "BH", name: "Bahrain", currency: "BHD", citations: ["Labour Law (36/2012) Art. 116", "Law 17/2017"] },
      { code: "QA", name: "Qatar", currency: "QAR", citations: ["Labour Law (14/2004) Art. 54"] },
      { code: "OM", name: "Oman", currency: "OMR", citations: ["Labour Law (RD 35/2003 as amended; Law 53/2023)"] },
      { code: "KW", name: "Kuwait", currency: "KWD", citations: ["Labour Law for Private Sector (6/2010) Art. 51"] },
    ],
    notes: [
      "Use BASIC salary (not gross) for UAE / QA / OM. Use full WAGE for KSA / KW (includes regular components).",
      "Service must reach 1 year for UAE / QA / OM. KSA: resignation requires 2 yrs.",
      "Cap on total: UAE = 2 years basic; KW = 1.5 years.",
      "Dismissal for cause (UAE Art. 44 / KSA Art. 80) may forfeit gratuity.",
    ],
  });
});
