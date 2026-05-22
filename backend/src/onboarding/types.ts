/**
 * Shared types for the firm onboarding / agent-builder module.
 *
 * `ScrapeResult` / `ScrapedPage` / `ScrapeError` mirror the shapes produced by
 * `firmScraper.ts` and consumed by `firmAnalyzer.ts`.
 * `AgentProfile` is the validated, citation-backed output of the analysis step.
 * `LlmFn` is the thin injection seam that keeps firmAnalyzer free of any
 * provider coupling — pass a real Anthropic / OpenAI call-site in production
 * or a deterministic stub in tests.
 *
 * Adapted from Lavern (Apache-2.0) `src/api/agent-builder/firm-scraper.ts` and
 * `src/api/agent-builder/firm-analyzer.ts` — I/O contracts preserved, provider
 * coupling removed.
 */

// ── Scraper types ──────────────────────────────────────────────────────────

/** A single fetched + cleaned page from the firm's website. */
export interface ScrapedPage {
  /** Absolute URL of this page. */
  url: string;
  /** Text extracted from the <title> element, or empty string. */
  title: string;
  /** Nav/script/style-stripped body text, suitable for LLM consumption. */
  text: string;
}

/** Aggregated result of scraping up to MAX_PAGES pages of a firm website. */
export interface ScrapeResult {
  /** Canonical root URL (https, resolved). */
  rootUrl: string;
  /** Title of the root page. */
  siteTitle: string;
  /** All fetched pages, root first. */
  pages: ScrapedPage[];
  /** Sum of all page `.text` lengths; used for thin-content guard. */
  combinedChars: number;
}

/** Error codes the scraper may surface. */
export type ScrapeErrorCode =
  | "invalid_url"
  | "blocked_target"
  | "fetch_failed"
  | "too_thin";

/** Typed error thrown (never returned) by `scrapeFirmSite`. */
export class ScrapeError extends Error {
  readonly code: ScrapeErrorCode;

  constructor(code: ScrapeErrorCode, message: string) {
    super(message);
    this.name = "ScrapeError";
    this.code = code;
  }
}

// ── Analyzer types ─────────────────────────────────────────────────────────

/**
 * Personality trait axes, each scored 1–10.
 * Low = left label, high = right label.
 */
export interface PersonalityTraits {
  "conservative-vs-creative": number;
  "thorough-vs-fast": number;
  "risk-averse-vs-tolerant": number;
  "formal-vs-approachable": number;
  "adversarial-vs-collaborative": number;
}

/** 1–10 integer ratings across eight lawyering dimensions. */
export interface SkillRatings {
  precision: number;
  creativity: number;
  speed: number;
  depth: number;
  negotiation: number;
  communication: number;
  research: number;
  risk: number;
}

/** Narrative personality characterisation for a single agent. */
export interface PersonalityProfile {
  /** Short archetype label, e.g. "The Gatekeeper". Max 60 chars. */
  archetype: string;
  traits: PersonalityTraits;
  /** One-to-two sentence editorial description of work style. Max 280 chars. */
  workStyle: string;
}

/** Cost tier maps to model cost bucket. */
export type CostTier = "opus" | "sonnet" | "haiku";

/** Category within the multi-agent system. */
export type AgentCategory = "lawyer" | "specialist" | "infrastructure" | "orchestrator";

/** Seniority ladder. */
export type AgentSeniority =
  | "partner"
  | "senior-associate"
  | "associate"
  | "junior"
  | "specialist"
  | "counsel";

/**
 * A single validated agent profile produced by the firm analyzer.
 *
 * Every field is required. The `seenOnSite` field carries a one-line
 * evidence citation from the scraped content; profiles lacking it are
 * dropped before the array is returned to the caller.
 *
 * Source attribution: shape derived from Lavern `GeneratedAgentSchema`
 * (Apache-2.0), `src/api/agent-builder/firm-analyzer.ts`.
 */
export interface AgentProfile {
  /** Real person's name + title as it appears on the site. Max 60 chars. */
  displayName: string;
  /** One-line editorial positioning. Max 140 chars. */
  tagline: string;
  category: AgentCategory;
  seniority: AgentSeniority;
  costTier: CostTier;
  /** Standard hourly rate in USD, integer, 100–5000. */
  billingRateUsd: number;
  skills: SkillRatings;
  personality: PersonalityProfile;
  /** 1–4 practice areas, each max 40 chars. */
  practiceAreas: string[];
  /** 2–4 strengths, each max 140 chars. */
  strengths: string[];
  /** 1–3 limitations, each max 140 chars. */
  limitations: string[];
  /**
   * REQUIRED. One-line verbatim or near-verbatim evidence from the scraped
   * pages that makes this agent profile plausible. Must contain the person's
   * name. Max 240 chars.
   */
  seenOnSite: string;
}

/**
 * LLM injection seam — a bare async function that accepts a prompt string
 * and returns the raw text response.
 *
 * Keeping this as a plain function type (rather than a class or object)
 * makes it trivial to stub in tests and swap providers in production without
 * touching the analyzer at all.
 */
export type LlmFn = (prompt: string) => Promise<string>;
