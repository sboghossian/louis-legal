/**
 * Skill router — given a user message, returns the skill IDs to load and the composed system prompt.
 *
 * This is a v1 keyword-based router. Future v2: replace with an LLM intent classifier
 * (using `router.intent-detection` as the system prompt).
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { composeSystemPrompt, getSkill, loadAllSkills } from "./_loader";
import {
  classifyWithLLM,
  classifyForRouting,
  PRACTICE_AREAS,
  type PracticeArea,
  type RoutingClassification,
  type RoutingIntent,
} from "./_llm-classifier";
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
  /** Matter tags (jurisdiction, practice-area-hint, matter id, etc.). Used by classifier. */
  matterTags?: string[];
  /** Last 3 turns of chat history (will be truncated). Used by classifier. */
  chatHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  /** User's BYO provider keys, looked up per request. */
  apiKeys?: { anthropic?: string; gemini?: string };
  /**
   * User preference: auto-pick the model based on classifier. Defaults to true.
   * The caller still applies precedence (user composer pick > classifier > env default).
   */
  autoRouteModel?: boolean;
  /** If true, allow the classifier to fall back to server-side API keys. Default false. */
  allowServerClassifierKeys?: boolean;
}

export interface RouteDecision {
  /** Ordered skill IDs that compose the system prompt extras. */
  skillIds: string[];
  /** Derived intent labels for logging / observability. */
  intent: {
    primary: string;
    practiceArea?: string;
    jurisdiction?: string;
    /** Narrower routing intent from `classifyForRouting`. */
    routingIntent?: RoutingIntent;
  };
  /** Where the intent classification came from. */
  classifierSource: "keyword" | "llm-fallback" | "hybrid" | "auto-route";
  /** Model the classifier recommends (null = no opinion; caller may pass through to env default). */
  recommendedModel: string | null;
  /** Practice-area playbook slug picked by the classifier (matches `playbooks/<slug>.CLAUDE.md`). */
  playbookSlug: PracticeArea | null;
  /** Confidence score from the classifier (0..1). */
  routingConfidence: number;
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

// ----- playbook loader -----

const PLAYBOOKS_DIR = join(__dirname, "playbooks");
const _playbookCache: Map<PracticeArea, string> = new Map();

/**
 * Load `playbooks/<slug>.CLAUDE.md` and return the body (frontmatter stripped).
 * Cached. Returns empty string if missing — caller treats that as "no playbook".
 */
export function loadPlaybook(slug: PracticeArea): string {
  const hit = _playbookCache.get(slug);
  if (hit !== undefined) return hit;
  const path = join(PLAYBOOKS_DIR, `${slug}.CLAUDE.md`);
  if (!existsSync(path)) {
    _playbookCache.set(slug, "");
    return "";
  }
  const raw = readFileSync(path, "utf-8");
  // Strip YAML frontmatter (if present)
  let body = raw;
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end >= 0) body = raw.slice(end + 4).replace(/^\n/, "");
  }
  _playbookCache.set(slug, body);
  return body;
}

/**
 * Async router. New flow when `autoRouteModel` is on (default):
 *
 *  1. Run `classifyForRouting` to get a practice area + recommended model +
 *     narrow intent. The classifier is cheap (Haiku/Gemini Flash) and falls
 *     back to keyword heuristics, so it always returns something.
 *  2. Map the classifier intent into the legacy keyword intent so the rest of
 *     the prompt composition still works.
 *  3. Load `playbooks/<slug>.CLAUDE.md` and prepend it to the composed system
 *     prompt extras — this gives the model a high-level practice-area framing.
 *  4. Filter the ~983 skills to the practice area before scoring and trim to
 *     the top 8–13 entries.
 *
 * If `autoRouteModel` is false we fall back to the legacy keyword + Gemini
 * fallback path used since v1.
 *
 * Logs the decision into the in-memory ring buffer for /api/skills/route-debug.
 */
export async function routeAsync(ctx: RouteContext): Promise<RouteDecision> {
  const started = Date.now();
  const message = ctx.message;
  const autoRoute = ctx.autoRouteModel !== false; // default ON

  let classification: RoutingClassification | undefined;
  if (autoRoute) {
    classification = await classifyForRouting({
      message,
      matterTags: ctx.matterTags,
      history: ctx.chatHistory?.slice(-3),
      apiKeys: ctx.apiKeys,
      allowServerKeys: ctx.allowServerClassifierKeys,
    });
  }

  // Default to keyword-based detection — classifier augments / overrides.
  let primary = detectIntent(message);
  let docType = detectDocType(message);
  let jurisdiction = detectJurisdiction(message);
  let classifierSource: RouteDecision["classifierSource"] = "keyword";

  if (classification) {
    classifierSource = "auto-route";
    // Translate the narrow routing intent into the legacy intent enum the
    // routeFromIntent switch expects.
    primary = mapRoutingIntentToLegacy(classification.intent);
    // If the classifier nominates a practice area but keyword detection has no
    // docType, synthesise one for skill picking.
    if (classification.practiceArea && !docType) {
      docType = guessDocTypeForArea(classification.practiceArea, message);
    }
  } else {
    // Legacy v1 fallback: if keyword says chitchat but the message is
    // non-trivial, try the wider Gemini classifier.
    const messageWords = message.trim().split(/\s+/).filter(Boolean).length;
    if (primary === "chitchat" && messageWords >= 3) {
      const llm = await classifyWithLLM(message);
      if (llm && llm.confidence >= 0.6 && llm.primary !== "chitchat") {
        primary = llm.primary;
        classifierSource = "llm-fallback";
        if (!jurisdiction && llm.jurisdiction) jurisdiction = llm.jurisdiction;
        if (!docType && llm.practiceArea) {
          docType = guessDocTypeForArea(llm.practiceArea, message);
        }
      }
    }
  }

  const playbookSlug: PracticeArea | null = classification?.practiceArea ?? null;
  const decision = routeFromIntent(ctx, {
    primary,
    docType,
    jurisdiction,
    classifierSource,
    playbookSlug,
    routingIntent: classification?.intent,
    recommendedModel: classification?.recommendedModel ?? null,
    routingConfidence: classification?.confidence ?? 0,
  });

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
    // _observability accepts a narrower enum; map "auto-route" -> "hybrid"
    classifierSource: decision.classifierSource === "auto-route" ? "hybrid" : decision.classifierSource,
    latencyMs: Date.now() - started,
  });
  return decision;
}

function mapRoutingIntentToLegacy(intent: RoutingIntent): string {
  switch (intent) {
    case "draft":      return "drafting";
    case "redline":    return "review";
    case "review":     return "review";
    case "research":   return "research";
    case "summarize":  return "summarize";
    case "extract":    return "summarize";
    case "calc":       return "calculate";
    case "compliance": return "advice";
    case "strategy":   return "advice";
    default:           return "chitchat";
  }
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
    classifierSource: RouteDecision["classifierSource"];
    playbookSlug?: PracticeArea | null;
    routingIntent?: RoutingIntent;
    recommendedModel?: string | null;
    routingConfidence?: number;
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

  // ----- practice-area filter + skill trim -----

  // Filter to skills that actually exist; dedupe.
  loadAllSkills();
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const id of skillIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (getSkill(id)) valid.push(id);
  }

  // If the classifier picked a practice area, filter the variable / docType
  // skills down to that area before composing the prompt. Always-on skills
  // (persona, safety, heuristic, output) are kept regardless. Trim the
  // remainder so the system prompt stays within a 8–13 skill budget.
  const slug = classified.playbookSlug ?? null;
  let filtered = valid;
  if (slug) {
    filtered = filterSkillsToPracticeArea(valid, slug);
  }
  const trimmed = trimSkillList(filtered, 13);

  // ----- compose system prompt: playbook first, then skills -----

  const composed = trimmed.length ? composeSystemPrompt(trimmed) : "";
  const playbookBody = slug ? loadPlaybook(slug) : "";
  const systemPromptExtra = [
    playbookBody ? `## PLAYBOOK: ${slug}\n\n${playbookBody}` : "",
    composed,
  ].filter(Boolean).join("\n\n---\n\n");

  return {
    skillIds: trimmed,
    intent: {
      primary: intent,
      practiceArea: slug ?? docType?.practiceArea,
      jurisdiction,
      routingIntent: classified.routingIntent,
    },
    classifierSource: classified.classifierSource,
    recommendedModel: classified.recommendedModel ?? null,
    playbookSlug: slug,
    routingConfidence: classified.routingConfidence ?? 0,
    systemPromptExtra,
  };
}

/** Categories that are not practice-area-specific and should never be filtered out. */
const ALWAYS_ON_CATEGORIES = new Set([
  "persona",
  "conversation",
  "safety",
  "heuristic",
  "output",
  "router",
  "onboarding",
  "voice",
  "tool",      // calculators etc. — keep
]);

function filterSkillsToPracticeArea(ids: string[], slug: PracticeArea): string[] {
  return ids.filter(id => {
    const s = getSkill(id);
    if (!s) return false;
    const cat = s.frontmatter.category;
    if (ALWAYS_ON_CATEGORIES.has(cat)) return true;
    const pa = s.frontmatter.practice_area;
    if (!pa) return true; // skill not tagged → keep (don't drop legacy skills)
    // Accept both exact match and family match (e.g. "corporate" matches "corporate-commercial")
    return pa === slug || slug.startsWith(`${pa}-`) || pa.startsWith(`${slug.split("-")[0]}`);
  });
}

/**
 * Keep at most `max` skills. Always-on categories survive first, then
 * remaining slots are filled in original order so docType / intent skills
 * win over generic output skills.
 */
function trimSkillList(ids: string[], max: number): string[] {
  if (ids.length <= max) return ids;
  const alwaysOn: string[] = [];
  const rest: string[] = [];
  for (const id of ids) {
    const s = getSkill(id);
    if (s && ALWAYS_ON_CATEGORIES.has(s.frontmatter.category)) alwaysOn.push(id);
    else rest.push(id);
  }
  const room = Math.max(0, max - alwaysOn.length);
  return [...alwaysOn, ...rest.slice(0, room)];
}

// Re-export for callers that want to use the practice-area type alongside the router
export { PRACTICE_AREAS };
export type { PracticeArea, RoutingIntent };
