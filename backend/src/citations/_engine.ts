/**
 * Citation Engine — jurisdiction-aware legal citation formatting.
 *
 * Supports parsing structured citation input and rendering in:
 *  - Bluebook (US)
 *  - OSCOLA (UK)
 *  - DIFC Practice Direction citation style
 *  - ADGM citation style
 *  - KSA Official Gazette
 *  - UAE Federal Gazette
 *  - Lebanon citation style
 *  - French citation style (Dalloz)
 *  - EU ECLI
 *
 * Also: detect-and-format mode — paste raw citation, auto-detect format,
 * convert to target style.
 */

export type CitationStyle =
  | "bluebook"
  | "oscola"
  | "difc"
  | "adgm"
  | "ksa-gazette"
  | "uae-federal"
  | "lb-gazette"
  | "fr-dalloz"
  | "eu-ecli";

export type SourceType = "case" | "statute" | "regulation" | "treaty" | "secondary";

export interface CitationInput {
  sourceType: SourceType;

  // Case fields
  caseName?: string; // "Smith v Jones"
  caseYear?: number;
  reporter?: string; // "1 WLR 123" or "FSCR" etc.
  citation?: string; // raw citation string
  court?: string;   // "EWHC", "DIFC CFI", "ADGM CFI", "KSA SCC"
  paragraph?: number;

  // Statute fields
  jurisdiction?: string;
  statuteName?: string;
  statuteNumber?: string; // "Federal Decree-Law 33/2021"
  article?: string;
  section?: string;
  yearEnacted?: number;

  // Regulation fields
  regulator?: string;
  regulationName?: string;
  regulationNumber?: string;

  // Treaty fields
  treatyName?: string;
  treatyDate?: string;
  partyState?: string;

  // Secondary
  author?: string;
  title?: string;
  publisher?: string;
  year?: number;
  pinpoint?: string;
}

export interface RenderedCitation {
  style: CitationStyle;
  rendered: string;
  short?: string; // short-form for subsequent references
  warnings?: string[];
}

/**
 * Format a citation in a specific style.
 */
export function formatCitation(input: CitationInput, style: CitationStyle): RenderedCitation {
  switch (style) {
    case "bluebook":
      return bluebook(input);
    case "oscola":
      return oscola(input);
    case "difc":
      return difc(input);
    case "adgm":
      return adgm(input);
    case "ksa-gazette":
      return ksaGazette(input);
    case "uae-federal":
      return uaeFederal(input);
    case "lb-gazette":
      return lbGazette(input);
    case "fr-dalloz":
      return frDalloz(input);
    case "eu-ecli":
      return euEcli(input);
    default:
      throw new Error(`Unsupported style: ${style}`);
  }
}

/**
 * Format the same citation in multiple styles (for comparison).
 */
export function formatAll(input: CitationInput, styles: CitationStyle[]): RenderedCitation[] {
  return styles.map(s => formatCitation(input, s));
}

// ============== BLUEBOOK (US) ==============
function bluebook(input: CitationInput): RenderedCitation {
  const warnings: string[] = [];
  let rendered = "";
  let short: string | undefined;
  switch (input.sourceType) {
    case "case": {
      // Form: Smith v. Jones, 123 F.3d 456, 459 (2d Cir. 2020)
      const parts: string[] = [];
      if (input.caseName) parts.push(italicize(input.caseName));
      const inlineCite = [input.citation, input.paragraph ? `at ${input.paragraph}` : null].filter(Boolean).join(", ");
      if (inlineCite) parts.push(inlineCite);
      const courtYear: string[] = [];
      if (input.court) courtYear.push(input.court);
      if (input.caseYear) courtYear.push(String(input.caseYear));
      if (courtYear.length) parts.push(`(${courtYear.join(" ")})`);
      rendered = parts.join(", ");
      short = input.caseName ? italicize(`${shortCaseName(input.caseName)}, supra`) : undefined;
      break;
    }
    case "statute":
      rendered = [input.statuteName, input.statuteNumber, input.article ? `§ ${input.article}` : input.section ? `§ ${input.section}` : null].filter(Boolean).join(" ");
      break;
    case "regulation":
      rendered = [input.regulationNumber || input.regulationName, input.section ? `§ ${input.section}` : null, input.year ? `(${input.year})` : null].filter(Boolean).join(" ");
      break;
    case "secondary":
      rendered = [
        input.author,
        input.title ? italicize(input.title) : null,
        input.pinpoint,
        input.publisher && input.year ? `(${input.publisher} ${input.year})` : input.year ? `(${input.year})` : null,
      ].filter(Boolean).join(", ");
      break;
    case "treaty":
      rendered = [input.treatyName, input.treatyDate].filter(Boolean).join(", ");
      break;
  }
  return { style: "bluebook", rendered, short, warnings };
}

// ============== OSCOLA (UK) ==============
function oscola(input: CitationInput): RenderedCitation {
  const warnings: string[] = [];
  let rendered = "";
  switch (input.sourceType) {
    case "case": {
      // Form: Smith v Jones [2020] EWHC 123 (Comm) [45]
      const parts: string[] = [];
      if (input.caseName) parts.push(input.caseName.replace(/\sv\.\s/g, " v "));
      const year = input.caseYear ? `[${input.caseYear}]` : null;
      if (year) parts.push(year);
      if (input.citation) parts.push(input.citation);
      if (input.court && !input.citation?.includes(input.court)) parts.push(`(${input.court})`);
      if (input.paragraph) parts.push(`[${input.paragraph}]`);
      rendered = parts.join(" ");
      break;
    }
    case "statute":
      rendered = [input.statuteName, input.statuteNumber, input.section ? `s ${input.section}` : input.article ? `art ${input.article}` : null].filter(Boolean).join(", ");
      break;
    case "regulation":
      rendered = [input.regulationName, input.regulationNumber, input.section ? `reg ${input.section}` : null].filter(Boolean).join(", ");
      break;
    case "secondary":
      rendered = [
        input.author,
        input.title ? italicize(input.title) : null,
        input.publisher && input.year ? `(${input.publisher} ${input.year})` : input.year ? `(${input.year})` : null,
        input.pinpoint,
      ].filter(Boolean).join(", ");
      break;
    case "treaty":
      rendered = [input.treatyName, input.treatyDate].filter(Boolean).join(", ");
      break;
  }
  return { style: "oscola", rendered, warnings };
}

// ============== DIFC ==============
function difc(input: CitationInput): RenderedCitation {
  const warnings: string[] = [];
  let rendered = "";
  switch (input.sourceType) {
    case "case": {
      // Form: Acme v Globex [CFI-001-2024] DIFC CFI [45]
      const parts: string[] = [];
      if (input.caseName) parts.push(input.caseName);
      if (input.citation) parts.push(`[${input.citation}]`);
      if (input.court) parts.push(input.court);
      else parts.push("DIFC CFI");
      if (input.paragraph) parts.push(`[${input.paragraph}]`);
      rendered = parts.join(" ");
      break;
    }
    case "statute": {
      // DIFC Law No. X of YYYY, Art. N
      const sn = input.statuteName || `DIFC Law No. ${input.statuteNumber || "?"}`;
      rendered = [sn, input.yearEnacted ? `of ${input.yearEnacted}` : null, input.article ? `Art. ${input.article}` : null].filter(Boolean).join(" ");
      break;
    }
    case "regulation":
      rendered = [input.regulator || "DFSA", input.regulationName, input.section].filter(Boolean).join(" ");
      break;
    case "secondary":
    case "treaty":
      rendered = bluebook(input).rendered; // fall back
      break;
  }
  return { style: "difc", rendered, warnings };
}

// ============== ADGM ==============
function adgm(input: CitationInput): RenderedCitation {
  const warnings: string[] = [];
  let rendered = "";
  switch (input.sourceType) {
    case "case": {
      const parts: string[] = [];
      if (input.caseName) parts.push(input.caseName);
      if (input.citation) parts.push(`[${input.citation}]`);
      if (input.court) parts.push(input.court);
      else parts.push("ADGM CFI");
      if (input.paragraph) parts.push(`[${input.paragraph}]`);
      rendered = parts.join(" ");
      break;
    }
    case "statute":
      rendered = [input.statuteName || `ADGM ${input.statuteNumber}`, input.article ? `Art. ${input.article}` : null].filter(Boolean).join(" ");
      break;
    case "regulation":
      rendered = [input.regulator || "FSRA", input.regulationName, input.section].filter(Boolean).join(" ");
      break;
    default:
      rendered = oscola(input).rendered;
  }
  return { style: "adgm", rendered, warnings };
}

// ============== KSA OFFICIAL GAZETTE ==============
function ksaGazette(input: CitationInput): RenderedCitation {
  const warnings: string[] = [];
  let rendered = "";
  switch (input.sourceType) {
    case "statute": {
      // Royal Decree No. M/XX dated DD/MM/YYYY (or Hijri); Article N
      const parts: string[] = [];
      if (input.statuteName) parts.push(input.statuteName);
      if (input.statuteNumber) parts.push(input.statuteNumber);
      if (input.yearEnacted) parts.push(`(${input.yearEnacted})`);
      if (input.article) parts.push(`Art. ${input.article}`);
      rendered = parts.join(", ");
      break;
    }
    case "regulation":
      rendered = [input.regulator, input.regulationName, input.regulationNumber, input.section].filter(Boolean).join(", ");
      break;
    case "case":
      // KSA case citation typically refers to court + docket
      rendered = [input.court || "Saudi Commercial Court", input.citation, input.caseYear].filter(Boolean).join(", ");
      warnings.push("KSA case citation is by court + docket number; published reports rare.");
      break;
    default:
      rendered = bluebook(input).rendered;
  }
  return { style: "ksa-gazette", rendered, warnings };
}

// ============== UAE FEDERAL GAZETTE ==============
function uaeFederal(input: CitationInput): RenderedCitation {
  const warnings: string[] = [];
  let rendered = "";
  switch (input.sourceType) {
    case "statute": {
      // Federal Decree-Law No. 33 of 2021, Art. 42
      const parts: string[] = [];
      const sn = input.statuteName || "";
      const num = input.statuteNumber || "";
      if (sn.toLowerCase().includes("federal") || num.toLowerCase().includes("federal")) {
        parts.push(`${sn} ${num}`.trim());
      } else {
        parts.push(`UAE ${sn} ${num}`.trim());
      }
      if (input.yearEnacted && !parts[0].includes(String(input.yearEnacted))) parts.push(`of ${input.yearEnacted}`);
      if (input.article) parts.push(`Art. ${input.article}`);
      rendered = parts.filter(Boolean).join(", ");
      break;
    }
    case "regulation":
      rendered = [input.regulator, input.regulationName, input.regulationNumber, input.section].filter(Boolean).join(", ");
      break;
    case "case":
      rendered = [input.court || "UAE Federal Supreme Court", input.citation, input.caseYear].filter(Boolean).join(", ");
      break;
    default:
      rendered = bluebook(input).rendered;
  }
  return { style: "uae-federal", rendered, warnings };
}

// ============== LEBANON GAZETTE ==============
function lbGazette(input: CitationInput): RenderedCitation {
  const warnings: string[] = [];
  let rendered = "";
  switch (input.sourceType) {
    case "statute":
      rendered = [input.statuteName || "Loi", input.statuteNumber, input.yearEnacted ? `(${input.yearEnacted})` : null, input.article ? `Art. ${input.article}` : null].filter(Boolean).join(" ");
      break;
    case "regulation":
      rendered = [input.regulator, input.regulationName, input.regulationNumber].filter(Boolean).join(", ");
      break;
    case "case":
      rendered = [input.court || "Cour de cassation", input.caseName, input.citation, input.caseYear].filter(Boolean).join(", ");
      break;
    default:
      rendered = bluebook(input).rendered;
  }
  return { style: "lb-gazette", rendered, warnings };
}

// ============== FRENCH DALLOZ ==============
function frDalloz(input: CitationInput): RenderedCitation {
  const warnings: string[] = [];
  let rendered = "";
  switch (input.sourceType) {
    case "case":
      // Cass. com., 7 mars 2018, n° 16-23.000, D. 2018, p. 700
      rendered = [input.court || "Cass. com.", input.caseName, input.citation, input.caseYear].filter(Boolean).join(", ");
      break;
    case "statute":
      rendered = [input.statuteName, input.article ? `art. ${input.article}` : null].filter(Boolean).join(", ");
      break;
    case "regulation":
      rendered = [input.regulator, input.regulationName, input.regulationNumber].filter(Boolean).join(", ");
      break;
    default:
      rendered = bluebook(input).rendered;
  }
  return { style: "fr-dalloz", rendered, warnings };
}

// ============== EU ECLI ==============
function euEcli(input: CitationInput): RenderedCitation {
  const warnings: string[] = [];
  let rendered = "";
  // ECLI:[Country]:[Court]:[Year]:[Identifier]
  if (input.citation && input.citation.startsWith("ECLI:")) {
    rendered = input.citation;
  } else if (input.sourceType === "case") {
    rendered = [input.caseName, input.citation, input.caseYear].filter(Boolean).join(", ");
    warnings.push("For EU case law, prefer the ECLI identifier (e.g., ECLI:EU:C:2014:317).");
  } else {
    rendered = bluebook(input).rendered;
  }
  return { style: "eu-ecli", rendered, warnings };
}

// ============== HELPERS ==============
function italicize(s: string): string {
  // Markdown italics — front-end / output downstream can interpret.
  return `*${s}*`;
}

function shortCaseName(full: string): string {
  // "Smith v. Jones, et al." → "Smith"
  const m = full.match(/^([^,]+?)(\s+v\.?\s+|$)/);
  if (m) return m[1];
  return full.split(",")[0];
}

/**
 * Auto-detect citation style from raw input.
 */
export function detectStyle(raw: string): CitationStyle | "unknown" {
  if (raw.includes("[") && raw.includes("]") && /\(\d+\)|\d{4}/.test(raw)) {
    if (raw.includes("EWHC") || raw.includes("UKSC") || raw.includes("UKHL")) return "oscola";
    if (raw.includes("DIFC")) return "difc";
    if (raw.includes("ADGM")) return "adgm";
  }
  if (/F\.\d|U\.S\./.test(raw)) return "bluebook";
  if (raw.includes("ECLI:")) return "eu-ecli";
  if (raw.includes("Royal Decree") || raw.includes("M/")) return "ksa-gazette";
  if (raw.includes("Federal Decree-Law") || raw.includes("FDL")) return "uae-federal";
  if (raw.includes("Cass.") || raw.includes("D. ")) return "fr-dalloz";
  if (raw.toLowerCase().includes("loi")) return "lb-gazette";
  return "unknown";
}
