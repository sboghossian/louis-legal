/**
 * Firm Analyzer — Convert scraped firm-site content into validated agent profiles.
 *
 * Architecture:
 *  - `LlmFn` is injected by the caller, keeping this module provider-agnostic
 *    and trivially testable with a deterministic stub.
 *  - The LLM is expected to return a single JSON object; both markdown-fenced
 *    blocks and raw JSON are handled by `extractFirstJsonObject`.
 *  - `zod` validates the parsed object before any profile is returned.
 *  - Any profile missing a `seenOnSite` field (or with an empty/whitespace-only
 *    value) is silently dropped — the caller receives only citation-backed profiles.
 *
 * Adapted from Lavern (Apache-2.0) `src/api/agent-builder/firm-analyzer.ts`.
 * Provider coupling (`crossProviderChat`), Lavern-specific logger, and the
 * `synthesiseFirmSoul` function removed.  `LlmFn` injection replaces the direct
 * provider call.  `buildPrompt` split into separate exported functions to allow
 * independent testing.
 */

import { z } from "zod";

import type { AgentProfile, LlmFn, ScrapeResult } from "./types";

// ── Zod schemas ────────────────────────────────────────────────────────────

/**
 * 1–10 integer ratings across eight lawyering dimensions.
 * Mirrors `SkillRatingsSchema` in Lavern's firm-analyzer (Apache-2.0).
 */
const SkillRatingsSchema = z.object({
  precision:     z.number().int().min(1).max(10),
  creativity:    z.number().int().min(1).max(10),
  speed:         z.number().int().min(1).max(10),
  depth:         z.number().int().min(1).max(10),
  negotiation:   z.number().int().min(1).max(10),
  communication: z.number().int().min(1).max(10),
  research:      z.number().int().min(1).max(10),
  risk:          z.number().int().min(1).max(10),
});

/**
 * Personality trait axes, each 1–10.
 * Low = left label, high = right label.
 */
const PersonalityTraitsSchema = z.object({
  "conservative-vs-creative":     z.number().int().min(1).max(10),
  "thorough-vs-fast":             z.number().int().min(1).max(10),
  "risk-averse-vs-tolerant":      z.number().int().min(1).max(10),
  "formal-vs-approachable":       z.number().int().min(1).max(10),
  "adversarial-vs-collaborative": z.number().int().min(1).max(10),
});

/** Narrative personality characterisation for a single agent. */
const PersonalityProfileSchema = z.object({
  archetype: z.string().min(1).max(60),
  traits:    PersonalityTraitsSchema,
  workStyle: z.string().min(1).max(280),
});

/**
 * Single agent profile as the LLM must produce it.
 *
 * `seenOnSite` is declared required here; a further filter in `analyzeFirm`
 * drops any profile where it is empty or whitespace-only even if Zod accepts it
 * (since `z.string().min(4)` already enforces a minimum, the post-parse filter
 * is a defence-in-depth backstop).
 *
 * Source attribution: derived from Lavern `GeneratedAgentSchema` (Apache-2.0).
 */
export const AgentProfileSchema = z.object({
  displayName:    z.string().min(1).max(60),
  tagline:        z.string().min(1).max(140),
  category:       z.enum(["lawyer", "specialist", "infrastructure", "orchestrator"]),
  seniority:      z.enum(["partner", "senior-associate", "associate", "junior", "specialist", "counsel"]),
  costTier:       z.enum(["opus", "sonnet", "haiku"]),
  billingRateUsd: z.number().int().min(100).max(5000),
  skills:         SkillRatingsSchema,
  personality:    PersonalityProfileSchema,
  practiceAreas:  z.array(z.string().min(1).max(40)).min(1).max(4),
  strengths:      z.array(z.string().min(4).max(140)).min(2).max(4),
  limitations:    z.array(z.string().min(4).max(140)).min(1).max(3),
  /**
   * One-line evidence from the site that this archetype is plausible.
   * Must be present and non-empty; profiles lacking it are dropped.
   */
  seenOnSite: z.string().min(4).max(240),
});

/** The top-level object the LLM must return. */
export const FirmAnalysisSchema = z.object({
  firmName:    z.string().min(1).max(120),
  firmTagline: z.string().min(1).max(200),
  agents:      z.array(AgentProfileSchema).min(0).max(10),
});

export type FirmAnalysisRaw = z.infer<typeof FirmAnalysisSchema>;

// ── JSON extraction ────────────────────────────────────────────────────────

/**
 * Extract the first balanced `{...}` JSON object from arbitrary LLM output.
 *
 * Handles:
 *  - Markdown fenced blocks (```json ... ```)
 *  - Leading prose or "thinking" text before the opening brace
 *  - Escaped characters and nested strings (minimal state machine)
 *
 * Returns the raw JSON substring, or `null` if no complete object is found.
 *
 * Source attribution: algorithm from Lavern `extractFirstJsonObject`
 * (Apache-2.0), logic preserved verbatim.
 */
export function extractFirstJsonObject(text: string): string | null {
  // Strip markdown code fences if present.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const haystack = fenceMatch ? fenceMatch[1] : text;

  const start = haystack.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < haystack.length; i++) {
    const ch = haystack[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return haystack.slice(start, i + 1);
    }
  }

  return null;
}

// ── Prompt builders ────────────────────────────────────────────────────────

/**
 * System prompt instructing the LLM to act as a firm analyst and return a
 * strict JSON object.  Only named individuals from the scraped content may
 * appear; `seenOnSite` must cite the specific line that names them.
 *
 * Exported so callers can inspect or override the prompt in integration tests.
 *
 * Source attribution: adapted from Lavern `buildSystemPrompt` (Apache-2.0).
 */
export function buildSystemPrompt(): string {
  return `You are a firm analyst. Given scraped content from a law or professional-services firm's public website, identify the named individuals on the team and express them as agents in a multi-agent legal system.

REQUIREMENTS

1. Named individuals only. No exceptions.
   Every agent MUST correspond to a real, NAMED person from the scraped content (team page, partner list, leadership bio, "About us" section, named article author). "displayName" MUST be that person's actual name as it appears on the site. "seenOnSite" MUST cite the specific line from the site that names that person — a practice-area paragraph is not acceptable.

2. Generic roles are forbidden.
   Do NOT invent roles like "Tech Counsel", "Knowledge Manager", or "Operations Lead" unless exactly those words appear as someone's actual title in the content. If you cannot find a real named person for a slot, leave it empty. Fewer agents is correct; invented personae are the worst possible outcome.

3. "agents" count is a maximum, not a target.
   If asked for 5 but only 3 named people appear, return 3. If the site has no named team members, return an empty array. Never pad.

4. Characterise each individual through what the site says about them — personality, skills, and seniority should reflect how they are described.

5. Skill ratings are 1–10 integers. Personality trait axes are 1–10 integers (low = left label, high = right label). Be deliberate — not every agent scores 10 at everything.

6. Billing rates by seniority: partner 1800–3500, counsel 1200–2000, senior-associate 900–1600, specialist 700–1400, associate 500–900, junior 200–500.

7. costTier guidance: partner/counsel → opus, senior-associate/specialist → opus or sonnet, associate → sonnet, junior → haiku.

8. Write taglines, strengths, limitations, and workStyle in confident editorial voice — short, declarative, no hype, no "passionate about".

9. Enums — category: "lawyer"|"specialist"|"infrastructure"|"orchestrator". seniority: "partner"|"senior-associate"|"associate"|"junior"|"specialist"|"counsel". costTier: "opus"|"sonnet"|"haiku".

OUTPUT FORMAT
Return ONE JSON object only — no markdown fences, no prose before or after:

{
  "firmName": "Example & Partners",
  "firmTagline": "One-line positioning from the site",
  "agents": [
    {
      "displayName": "Jane Smith, Managing Partner",
      "tagline": "Runs the firm. Signs every material engagement.",
      "category": "lawyer",
      "seniority": "partner",
      "costTier": "opus",
      "billingRateUsd": 2500,
      "skills": { "precision": 9, "creativity": 7, "speed": 6, "depth": 9, "negotiation": 8, "communication": 8, "research": 7, "risk": 9 },
      "personality": {
        "archetype": "The Gatekeeper",
        "traits": { "conservative-vs-creative": 4, "thorough-vs-fast": 3, "risk-averse-vs-tolerant": 2, "formal-vs-approachable": 2, "adversarial-vs-collaborative": 6 },
        "workStyle": "Commands the room. Reads the deal three moves ahead."
      },
      "practiceAreas": ["firm strategy", "complex negotiations"],
      "strengths": ["Sees the whole board three moves ahead", "Unwavering on non-negotiable terms"],
      "limitations": ["Slow to engage on low-stakes matters"],
      "seenOnSite": "Jane Smith is listed as Managing Partner on the Leadership page."
    }
  ]
}`;
}

/**
 * User turn — injects the scraped pages as context and issues the task.
 *
 * Per-page text is truncated to 6 000 chars to stay within context budget.
 * Exported so tests can verify prompt shape without running the LLM.
 *
 * Source attribution: adapted from Lavern `buildUserPrompt` (Apache-2.0).
 */
export function buildUserPrompt(scraped: ScrapeResult, maxAgents: number): string {
  const MAX_PAGE_CHARS = 6_000;
  const pagesBlock = scraped.pages
    .map((p, i) => {
      const body = p.text.length > MAX_PAGE_CHARS
        ? `${p.text.slice(0, MAX_PAGE_CHARS)} [truncated]`
        : p.text;
      return `### Page ${i + 1}: ${p.url}\nTitle: ${p.title || "(none)"}\n---\n${body}`;
    })
    .join("\n\n");

  return `Firm website: ${scraped.rootUrl}
Site title: ${scraped.siteTitle || "(none)"}

## Scraped content

${pagesBlock}

## Task

Find every named individual on this firm's team. Characterise up to ${maxAgents} of them as agents.

Process:
  1. Scan the scraped content for proper names attached to titles (Managing Partner, Partner, Of Counsel, Head of X, CEO, etc.).
  2. List every named person you found and the exact line that names them.
  3. Pick the most senior / prominent up to ${maxAgents}.
  4. Build an agent for each. displayName MUST be their actual name; seenOnSite MUST be the line that names them.

If step 1 finds fewer than ${maxAgents} named people, return only those found. Returning 0 is acceptable if the site has no named team members.

Return a JSON object: { firmName, firmTagline, agents }.`;
}

// ── Main entry ─────────────────────────────────────────────────────────────

/**
 * Analyse scraped firm-site content and return validated agent profiles.
 *
 * @param scraped   - Output of `scrapeFirmSite`.
 * @param llm       - LLM injection — async function accepting a prompt string
 *   and returning the raw text response.  Must not throw for well-formed
 *   prompts; errors are propagated as-is.
 * @param maxAgents - Maximum number of agent profiles to request. Defaults to 5.
 * @returns Array of `AgentProfile` objects, each guaranteed to carry a
 *   non-empty `seenOnSite` citation. May be empty if the site has no named
 *   team members or if all LLM-returned profiles fail validation.
 * @throws If the LLM returns no JSON object or one that fails Zod validation.
 *
 * Design note: the function never returns profiles lacking `seenOnSite` — they
 * are filtered out after Zod validation as a defence-in-depth backstop against
 * LLM hallucination, even though the schema already enforces `min(4)`.
 */
export async function analyzeFirm(
  scraped: ScrapeResult,
  llm: LlmFn,
  maxAgents = 5,
): Promise<AgentProfile[]> {
  const system = buildSystemPrompt();
  const user = buildUserPrompt(scraped, maxAgents);

  // The full prompt is system + user concatenated with a separator so a
  // plain LlmFn (single string in → string out) carries the full context.
  const prompt = `${system}\n\n---\n\n${user}`;

  const raw = await llm(prompt);

  const jsonText = extractFirstJsonObject(raw);
  if (!jsonText) {
    throw new Error("Firm analyzer: LLM response contained no JSON object.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(
      `Firm analyzer: LLM returned malformed JSON — ${(err as Error).message}`,
    );
  }

  const result = FirmAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Firm analyzer: schema validation failed — ${issues}`);
  }

  // Defence-in-depth: drop any profile whose seenOnSite is empty or
  // whitespace-only, even though the schema already requires min(4) chars.
  const withCitation = result.data.agents.filter(
    (a) => a.seenOnSite.trim().length > 0,
  );

  // Cast is safe: FirmAnalysisSchema's agent shape is a strict superset of
  // AgentProfile — all required fields are present and typed correctly.
  return withCitation as AgentProfile[];
}
