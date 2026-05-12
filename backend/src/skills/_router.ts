/**
 * Skill router — given a user message, returns the skill IDs to load and the composed system prompt.
 *
 * This is a v1 keyword-based router. Future v2: replace with an LLM intent classifier
 * (using `router.intent-detection` as the system prompt).
 */
import { composeSystemPrompt, getSkill, loadAllSkills } from "./_loader";
import { classifyWithLLM } from "./_llm-classifier";
import { logRouteDecision } from "./_observability";

export type Persona = "louis-twin" | "partner" | "associate" | "junior" | "in-house-counsel";
export type Surface = "web" | "mobile" | "voice" | "api" | "word-plugin";
export type Tier = "free" | "starter" | "pro" | "business" | "enterprise";

export interface RouteContext {
  /** The most recent user message text. */
  message: string;
  /** Stable defaults for the user when not derivable from the message. */
  persona?: Persona;
  surface?: Surface;
  tier?: Tier;
  /** Whether the chat has any uploaded documents in context (controls RAG-related skills). */
  hasDocuments?: boolean;
  /** For observability logging. */
  userId?: string;
  chatId?: string;
  projectId?: string;
}

export interface RouteDecision {
  /** Ordered skill IDs that compose the system prompt extras. */
  skillIds: string[];
  /** Derived intent labels for logging / observability. */
  intent: {
    primary: string;
    practiceArea?: string;
    jurisdiction?: string;
  };
  /** Where the intent classification came from. */
  classifierSource: "keyword" | "llm-fallback" | "hybrid";
  /** The composed system-prompt extra. May be empty string. */
  systemPromptExtra: string;
}

// ----- intent heuristics (regex/keyword v1) -----

const DRAFT_VERBS = /\b(draft|write|generate|create|prepare|produce|build me)\b/i;
const REVIEW_VERBS = /\b(review|redline|mark ?up|critique|analy[sz]e|check|audit|evaluate)\b/i;
const RESEARCH_VERBS = /\b(research|find (cases?|case ?law|the (statute|article))|look up|case law|precedent|recent (amend|ruling))\b/i;
const COMPARE_VERBS = /\b(compare|vs\b|versus|side by side|differences? between)\b/i;
const SUMMARIZE_VERBS = /\b(summari[sz]e|tl;dr|recap|brief me|shorten)\b/i;
const TRANSLATE_VERBS = /\b(translate|in english|into arabic|en français|to french)\b/i;
const CALCULATE_VERBS = /\b(calculate|compute|how much|end[- ]of[- ]service|gratuity|eosg|eosa|interest on|statutory interest)\b/i;
const ADVICE_VERBS = /\b(should i|can i|what (should|do i)|am i (allowed|entitled|liable))\b/i;

const DOC_TYPES: Array<[string, RegExp, string]> = [
  ["NDA-mutual",        /\b(mutual\s+)?(nda|non[- ]disclosure|confidentiality (agreement|contract))\b/i, "corporate"],
  ["NDA-unilateral",    /\bunilateral\s+nda|one[- ]way nda\b/i, "corporate"],
  ["MSA",               /\bm\.?s\.?a\.?|master services?\s+agreement|msaa?\b/i, "corporate"],
  ["SAFE",              /\bsafe\b.*\b(future equity|cap|valuation)\b|simple agreement for future equity/i, "corporate"],
  ["convertible-note",  /\bconvertible (note|debt|loan)\b/i, "corporate"],
  ["term-sheet-VC",     /\b(vc\s+)?term[- ]sheet|venture (round|term sheet)\b/i, "corporate"],
  ["share-purchase-agreement", /\bspa\b|share purchase agreement|sale of shares/i, "corporate"],
  ["employment-contract-LB", /\b(employment|labor|labour) (contract|agreement).*\b(lebanon|lebanese|lb)\b/i, "employment"],
  ["employment-contract-KSA", /\b(employment|labor).*\b(saudi|ksa|sa)\b|\bsaudi.*labor contract/i, "employment"],
  ["employment-contract-UAE", /\b(employment|labor).*\b(uae|emirates?|emirati|dubai|abu dhabi)\b/i, "employment"],
  ["severance-agreement", /\bseverance|separation agreement|exit (agreement|package)/i, "employment"],
  ["non-compete",       /\bnon[- ]compete|restraint of trade/i, "employment"],
  ["non-solicit",       /\bnon[- ]solicit\b/i, "employment"],
  ["residential-lease", /\bresidential lease|residential tenancy|apartment lease|home lease|housing lease/i, "real-estate"],
  ["commercial-lease",  /\b(commercial|office|retail|industrial)\s+lease\b/i, "real-estate"],
  ["will",              /\bwill\b.*\b(draft|prepare|make|testament)\b|\b(last will|testament)\b/i, "estate-personal-status"],
  ["power-of-attorney", /\bpower of attorney|\bpoa\b|wakala/i, "estate-personal-status"],
  ["demand-letter",     /\bdemand letter|letter before action/i, "litigation"],
  ["cease-and-desist",  /\bcease and desist\b/i, "litigation"],
  ["legal-opinion",     /\blegal opinion|memo of law|memorandum of law/i, "litigation"],
];

const JURISDICTION_HINTS: Array<[string, RegExp]> = [
  ["LB",   /\b(lebanon|lebanese|beirut|tripoli|saida|sidon|jbeil|byblos|lb)\b/i],
  ["KSA",  /\b(saudi|ksa|riyadh|jeddah|dammam|mecca|medina)\b/i],
  ["UAE",  /\b(uae|emirates|emirati|dubai|abu dhabi|sharjah|ajman|fujairah)\b/i],
  ["DIFC", /\bdifc\b/i],
  ["ADGM", /\badgm\b/i],
  ["EG",   /\b(egypt|cairo|alexandria)\b/i],
  ["FR",   /\b(france|french|paris)\b/i],
  ["UK",   /\b(united kingdom|england|wales|scotland|uk|london)\b/i],
  ["US",   /\b(united states|usa|us[- ]federal|delaware|new york|california)\b/i],
];

function detectIntent(message: string): string {
  if (DRAFT_VERBS.test(message))     return "drafting";
  if (REVIEW_VERBS.test(message))    return "review";
  if (RESEARCH_VERBS.test(message))  return "research";
  if (COMPARE_VERBS.test(message))   return "compare";
  if (SUMMARIZE_VERBS.test(message)) return "summarize";
  if (TRANSLATE_VERBS.test(message)) return "translate";
  if (CALCULATE_VERBS.test(message)) return "calculate";
  if (ADVICE_VERBS.test(message))    return "advice";
  return "chitchat";
}

function detectDocType(message: string): { id: string; practiceArea: string } | null {
  for (const [id, re, pa] of DOC_TYPES) {
    if (re.test(message)) return { id, practiceArea: pa };
  }
  return null;
}

function detectJurisdiction(message: string): string | undefined {
  for (const [iso, re] of JURISDICTION_HINTS) {
    if (re.test(message)) return iso;
  }
  return undefined;
}

function detectLanguage(message: string): "en" | "ar" | "fr" {
  if (/[؀-ۿ]/.test(message)) return "ar";
  if (/\b(bonjour|merci|svp|s'il vous plaît|le|la|de la)\b/i.test(message) &&
      !/\b(the|and|of|for|please)\b/i.test(message)) return "fr";
  return "en";
}

// ----- decision -----

/**
 * Compute the system prompt extra for a user message.
 * Returns an empty string if no skills apply (chitchat / out-of-scope).
 *
 * Synchronous variant — uses only keyword detection. Use `routeAsync` for the
 * LLM-fallback path that catches Arabic/French/indirect phrasings.
 */
export function route(ctx: RouteContext): RouteDecision {
  return routeFromIntent(ctx, {
    primary: detectIntent(ctx.message),
    docType: detectDocType(ctx.message),
    jurisdiction: detectJurisdiction(ctx.message),
    classifierSource: "keyword",
  });
}

/**
 * Async router: keyword first, fall back to Gemini if intent is chitchat.
 * Logs the decision into the in-memory ring buffer for /api/skills/route-debug.
 */
export async function routeAsync(ctx: RouteContext): Promise<RouteDecision> {
  const started = Date.now();
  const message = ctx.message;
  let primary = detectIntent(message);
  let docType = detectDocType(message);
  let jurisdiction = detectJurisdiction(message);
  let classifierSource: "keyword" | "llm-fallback" | "hybrid" = "keyword";

  // Fallback: if keyword says chitchat but the message is non-trivial, try LLM
  const messageWords = message.trim().split(/\s+/).filter(Boolean).length;
  if (primary === "chitchat" && messageWords >= 3) {
    const llm = await classifyWithLLM(message);
    if (llm && llm.confidence >= 0.6 && llm.primary !== "chitchat") {
      primary = llm.primary;
      classifierSource = "llm-fallback";
      if (!jurisdiction && llm.jurisdiction) jurisdiction = llm.jurisdiction;
      if (!docType && llm.practiceArea) {
        // Best-effort: pick a representative doc type for the practice area
        docType = guessDocTypeForArea(llm.practiceArea, message);
      }
    }
  }

  const decision = routeFromIntent(ctx, { primary, docType, jurisdiction, classifierSource });
  // Log
  logRouteDecision({
    ts: new Date().toISOString(),
    userId: ctx.userId,
    chatId: ctx.chatId,
    projectId: ctx.projectId,
    messagePreview: message.slice(0, 200),
    intentPrimary: decision.intent.primary,
    intentPracticeArea: decision.intent.practiceArea,
    intentJurisdiction: decision.intent.jurisdiction,
    skillIds: decision.skillIds,
    skillCount: decision.skillIds.length,
    systemPromptChars: decision.systemPromptExtra.length,
    classifierSource: decision.classifierSource,
    latencyMs: Date.now() - started,
  });
  return decision;
}

function guessDocTypeForArea(area: string, _message: string): { id: string; practiceArea: string } | null {
  const a = area.toLowerCase();
  if (a.includes("corporate")) return { id: "NDA-mutual", practiceArea: "corporate" };
  if (a.includes("employment")) return { id: "employment-contract-LB", practiceArea: "employment" };
  if (a.includes("real")) return { id: "residential-lease", practiceArea: "real-estate" };
  if (a.includes("litigation")) return { id: "demand-letter", practiceArea: "litigation" };
  if (a.includes("estate") || a.includes("personal")) return { id: "will", practiceArea: "estate-personal-status" };
  return null;
}

function routeFromIntent(
  ctx: RouteContext,
  classified: {
    primary: string;
    docType: { id: string; practiceArea: string } | null;
    jurisdiction?: string;
    classifierSource: "keyword" | "llm-fallback" | "hybrid";
  },
): RouteDecision {
  const { message } = ctx;
  const persona: Persona = ctx.persona ?? "associate";
  const intent = classified.primary;
  const docType = classified.docType;
  const jurisdiction = classified.jurisdiction;

  const skillIds: string[] = [];

  // Core always-on: persona + core conversation behavior
  skillIds.push(`persona.${persona}`);
  skillIds.push("conversation.clarifying-questions");
  skillIds.push("conversation.refusal-policy");

  // Disclaimer for B2C personas only
  if (persona === "louis-twin") {
    skillIds.push("conversation.disclaimer");
    skillIds.push("conversation.empathy-B2C");
  } else {
    skillIds.push("conversation.professional-B2B");
  }

  // Safety baseline
  skillIds.push("safety.no-legal-advice-disclaimer-rules");
  skillIds.push("safety.client-confidentiality-cross-tenant");

  // Heuristics that apply broadly
  skillIds.push("heuristic.always-state-jurisdiction-first");
  skillIds.push("heuristic.numbers-and-dates-double-check");

  // Jurisdiction-specific layer
  if (!jurisdiction) {
    skillIds.push("heuristic.refuse-if-no-jurisdiction-given");
  }

  // Intent-specific
  if (intent === "drafting") {
    skillIds.push("draft.contract-skeleton-builder");
    skillIds.push("draft.boilerplate-clauses");
    if (docType) {
      skillIds.push(`draft.${docType.id}`);
      // Pair with intake skill if it exists
      const intakeId = `conversation.intake-${docType.id.split("-")[0]}`;
      if (getSkill(intakeId)) skillIds.push(intakeId);
    }
  }

  if (intent === "review") {
    skillIds.push("review.contract-redline");
    skillIds.push("review.risk-flagging");
    skillIds.push("review.missing-clauses");
    if (docType) {
      // Try matching review skill
      const candidates = [`review.${docType.id}-quick-check`, `review.${docType.id}`];
      for (const c of candidates) if (getSkill(c)) { skillIds.push(c); break; }
    }
  }

  if (intent === "research") {
    skillIds.push("research.statute-lookup");
    skillIds.push("research.case-law-search");
    skillIds.push("output.inline-citations-with-pinpoints");
  }

  if (intent === "compare") {
    skillIds.push("research.jurisdiction-comparison");
    skillIds.push("output.table-of-comparisons");
  }

  if (intent === "calculate") {
    if (/end[- ]of[- ]service|gratuity|eosg|eosa/i.test(message)) {
      skillIds.push("tool.calculator-end-of-service-gratuity");
    }
    if (/statutory interest|legal interest/i.test(message)) {
      skillIds.push("tool.calculator-statutory-interest");
    }
  }

  // Output formatting based on surface
  const surface = ctx.surface ?? "web";
  if (surface === "mobile") skillIds.push("output.mobile-friendly-short");
  if (surface === "voice")  skillIds.push("output.mobile-friendly-short"); // voice-friendly skill TBD

  // Output structure for memos / opinions
  if (intent === "research" || intent === "advice") {
    skillIds.push("output.IRAC-structure");
    skillIds.push("output.executive-summary-first");
  }

  if (intent === "drafting") {
    skillIds.push("output.markdown-legal-doc");
  }

  // Bilingual: if user wrote in Arabic, add bilingual skills
  const lang = detectLanguage(message);
  if (lang === "ar") {
    skillIds.push("output.bilingual-formatting");
    if (intent === "drafting") {
      skillIds.push("draft.bilingual-AR-EN-side-by-side");
    }
  }

  // Filter to skills that actually exist; dedupe
  loadAllSkills();
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const id of skillIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (getSkill(id)) valid.push(id);
  }

  const systemPromptExtra = valid.length ? composeSystemPrompt(valid) : "";

  return {
    skillIds: valid,
    intent: {
      primary: intent,
      practiceArea: docType?.practiceArea,
      jurisdiction,
    },
    classifierSource: classified.classifierSource,
    systemPromptExtra,
  };
}
