/**
 * Public API for the firm onboarding / agent-builder module.
 *
 * Consumers should import from this barrel rather than from individual files
 * so internal restructuring doesn't break call sites.
 *
 * Exported surface:
 *  - `scrapeFirmSite`   — fetch + clean up to 3 pages of a firm website
 *  - `isPrivateIp`      — pure SSRF-guard predicate (also useful for tests)
 *  - `analyzeFirm`      — convert ScrapeResult → AgentProfile[] via injected LLM
 *  - `buildSystemPrompt` / `buildUserPrompt` — prompt builders (inspection / override)
 *  - `extractFirstJsonObject`               — JSON-from-LLM-text extractor
 *  - `AgentProfileSchema` / `FirmAnalysisSchema` — Zod schemas for external validation
 *  - All shared types via `./types`
 */

export { scrapeFirmSite, isPrivateIp, ScrapeError } from "./firmScraper";
export type { ScrapeResult, ScrapedPage } from "./firmScraper";

export {
  analyzeFirm,
  buildSystemPrompt,
  buildUserPrompt,
  extractFirstJsonObject,
  AgentProfileSchema,
  FirmAnalysisSchema,
} from "./firmAnalyzer";
export type { FirmAnalysisRaw } from "./firmAnalyzer";

export type {
  AgentProfile,
  AgentCategory,
  AgentSeniority,
  CostTier,
  LlmFn,
  PersonalityProfile,
  PersonalityTraits,
  SkillRatings,
  ScrapeErrorCode,
} from "./types";
