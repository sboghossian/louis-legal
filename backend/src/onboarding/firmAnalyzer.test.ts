/**
 * Unit tests for `analyzeFirm` and `extractFirstJsonObject`.
 *
 * All tests use a deterministic stub for `LlmFn` — no real network, DNS, or
 * LLM calls are made.  The stub returns a JSON string that the analyzer parses
 * and validates.
 *
 * Coverage:
 *  - Valid profiles with seenOnSite pass through unchanged.
 *  - A profile missing seenOnSite (empty string that passes Zod's min(4) guard
 *    only because we patch it back to empty after the schema check — tested
 *    via profiles produced with insufficient seenOnSite that won't survive the
 *    Zod min(4) check, so we test the actual drop logic via a post-parse path).
 *  - Malformed JSON from the LLM is handled gracefully (throws with message).
 *  - No JSON object in the LLM response is handled gracefully.
 *  - `extractFirstJsonObject` handles fenced code blocks and raw JSON.
 */

import { describe, it, expect } from "vitest";

import { analyzeFirm, extractFirstJsonObject } from "./firmAnalyzer";
import type { ScrapeResult } from "./types";
import type { LlmFn } from "./types";

// ── Test fixtures ──────────────────────────────────────────────────────────

/** Minimal ScrapeResult used across tests. */
const SCRAPED: ScrapeResult = {
  rootUrl: "https://example-firm.com/",
  siteTitle: "Example & Partners — Attorneys at Law",
  pages: [
    {
      url: "https://example-firm.com/",
      title: "Example & Partners — Attorneys at Law",
      text: "Jane Smith, Managing Partner. John Doe, Senior Associate. We provide corporate and IP legal services.",
    },
  ],
  combinedChars: 110,
};

/** A complete, valid agent profile payload. */
function makeValidAgentPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    displayName: "Jane Smith, Managing Partner",
    tagline: "Runs the firm. Signs every material engagement.",
    category: "lawyer",
    seniority: "partner",
    costTier: "opus",
    billingRateUsd: 2500,
    skills: {
      precision: 9, creativity: 7, speed: 6, depth: 9,
      negotiation: 8, communication: 8, research: 7, risk: 9,
    },
    personality: {
      archetype: "The Gatekeeper",
      traits: {
        "conservative-vs-creative": 4,
        "thorough-vs-fast": 3,
        "risk-averse-vs-tolerant": 2,
        "formal-vs-approachable": 2,
        "adversarial-vs-collaborative": 6,
      },
      workStyle: "Commands the room. Reads the deal three moves ahead.",
    },
    practiceAreas: ["corporate law", "IP"],
    strengths: ["Sees the board three moves ahead", "Unwavering on key terms"],
    limitations: ["Slow to engage on low-stakes matters"],
    seenOnSite: "Jane Smith is listed as Managing Partner on the Leadership page.",
    ...overrides,
  };
}

/** Build a full analysis JSON string from an agents array. */
function makeAnalysisJson(agents: Record<string, unknown>[]): string {
  return JSON.stringify({
    firmName: "Example & Partners",
    firmTagline: "Trusted counsel for complex matters.",
    agents,
  });
}

/** LlmFn stub that returns `response` regardless of the prompt. */
function stubLlm(response: string): LlmFn {
  return async (_prompt: string) => response;
}

// ── extractFirstJsonObject tests ───────────────────────────────────────────

describe("extractFirstJsonObject", () => {
  it("extracts a raw JSON object", () => {
    const text = '{"foo": "bar", "baz": 42}';
    expect(extractFirstJsonObject(text)).toBe(text);
  });

  it("extracts JSON from markdown fenced block", () => {
    const inner = '{"key": "value"}';
    const text = `Here is the result:\n\`\`\`json\n${inner}\n\`\`\`\nDone.`;
    const result = extractFirstJsonObject(text);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ key: "value" });
  });

  it("extracts JSON from fenced block without language tag", () => {
    const inner = '{"a": 1}';
    const text = `\`\`\`\n${inner}\n\`\`\``;
    const result = extractFirstJsonObject(text);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ a: 1 });
  });

  it("handles nested objects", () => {
    const text = '{"outer": {"inner": true}, "x": 1}';
    const result = extractFirstJsonObject(text);
    expect(result).toBe(text);
  });

  it("returns null when no JSON object is present", () => {
    expect(extractFirstJsonObject("no json here")).toBeNull();
    expect(extractFirstJsonObject("")).toBeNull();
  });

  it("skips leading prose", () => {
    const text = 'Sure! Here you go: {"done": true}';
    const result = extractFirstJsonObject(text);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual({ done: true });
  });

  it("handles braces inside strings correctly", () => {
    const text = '{"msg": "use {curly} braces"}';
    const result = extractFirstJsonObject(text);
    expect(result).toBe(text);
  });
});

// ── analyzeFirm — valid profiles ──────────────────────────────────────────

describe("analyzeFirm — valid profiles pass through", () => {
  it("returns all valid profiles when LLM response is well-formed", async () => {
    const agent1 = makeValidAgentPayload();
    const agent2 = makeValidAgentPayload({
      displayName: "John Doe, Senior Associate",
      tagline: "Corporate transactions from term sheet to close.",
      seniority: "senior-associate",
      costTier: "sonnet",
      billingRateUsd: 1100,
      seenOnSite: "John Doe listed as Senior Associate on the Team page.",
    });

    const llm = stubLlm(makeAnalysisJson([agent1, agent2]));
    const profiles = await analyzeFirm(SCRAPED, llm, 5);

    expect(profiles).toHaveLength(2);
    expect(profiles[0].displayName).toBe("Jane Smith, Managing Partner");
    expect(profiles[1].displayName).toBe("John Doe, Senior Associate");
  });

  it("returns correct AgentProfile field types", async () => {
    const llm = stubLlm(makeAnalysisJson([makeValidAgentPayload()]));
    const profiles = await analyzeFirm(SCRAPED, llm, 5);

    const p = profiles[0];
    expect(typeof p.billingRateUsd).toBe("number");
    expect(typeof p.skills.precision).toBe("number");
    expect(typeof p.personality.archetype).toBe("string");
    expect(Array.isArray(p.practiceAreas)).toBe(true);
    expect(Array.isArray(p.strengths)).toBe(true);
    expect(Array.isArray(p.limitations)).toBe(true);
  });

  it("handles an empty agents array (no named people on site)", async () => {
    const llm = stubLlm(makeAnalysisJson([]));
    const profiles = await analyzeFirm(SCRAPED, llm, 5);
    expect(profiles).toHaveLength(0);
  });

  it("respects maxAgents by sending it in the prompt (LLM behaviour)", async () => {
    // The analyzer itself doesn't slice the array; the prompt asks the LLM.
    // We verify the function accepts maxAgents without error.
    const llm = stubLlm(makeAnalysisJson([makeValidAgentPayload()]));
    const profiles = await analyzeFirm(SCRAPED, llm, 1);
    expect(profiles).toHaveLength(1);
  });
});

// ── analyzeFirm — seenOnSite filter ───────────────────────────────────────

describe("analyzeFirm — profiles missing seenOnSite are dropped", () => {
  it("drops a profile where seenOnSite is empty (bypasses Zod via post-parse filter)", async () => {
    // To test the post-parse filter we need a profile that passes Zod but has
    // an effectively empty seenOnSite.  Zod enforces min(4) so we use a
    // whitespace-padded string that satisfies the schema length but is empty
    // after .trim().
    const withEmptySeenOnSite = makeValidAgentPayload({
      seenOnSite: "    ", // 4 spaces — passes Zod min(4) but fails .trim() > 0
    });
    const validAgent = makeValidAgentPayload();

    // The whitespace-only seenOnSite profile should be dropped; the valid one kept.
    const llm = stubLlm(makeAnalysisJson([withEmptySeenOnSite, validAgent]));
    const profiles = await analyzeFirm(SCRAPED, llm, 5);

    expect(profiles).toHaveLength(1);
    expect(profiles[0].displayName).toBe("Jane Smith, Managing Partner");
  });

  it("returns an empty array when ALL profiles lack valid seenOnSite", async () => {
    // Both strings are >= 4 chars (pass Zod min(4)) but collapse to empty after trim.
    const noSeen1 = makeValidAgentPayload({ seenOnSite: "    " }); // 4 spaces
    const noSeen2 = makeValidAgentPayload({
      displayName: "Bob Brown, Associate",
      seenOnSite: "  \t  ", // spaces + tab
    });

    const llm = stubLlm(makeAnalysisJson([noSeen1, noSeen2]));
    const profiles = await analyzeFirm(SCRAPED, llm, 5);

    expect(profiles).toHaveLength(0);
  });
});

// ── analyzeFirm — error handling ──────────────────────────────────────────

describe("analyzeFirm — malformed LLM output handling", () => {
  it("throws when the LLM returns no JSON object", async () => {
    const llm = stubLlm("Sorry, I cannot help with that.");
    await expect(analyzeFirm(SCRAPED, llm, 5)).rejects.toThrow(
      /no JSON object/i,
    );
  });

  it("throws when the LLM returns malformed JSON (unbalanced braces)", async () => {
    const llm = stubLlm("{firmName: 'broken', agents: [}");
    await expect(analyzeFirm(SCRAPED, llm, 5)).rejects.toThrow(
      /malformed JSON/i,
    );
  });

  it("throws when the parsed JSON fails schema validation (missing required field)", async () => {
    // Omit the 'agents' key entirely.
    const llm = stubLlm(JSON.stringify({ firmName: "Acme Law", firmTagline: "We win." }));
    await expect(analyzeFirm(SCRAPED, llm, 5)).rejects.toThrow(
      /schema validation failed/i,
    );
  });

  it("throws when an agent has an invalid enum value", async () => {
    const badAgent = makeValidAgentPayload({ category: "paralegal" }); // not a valid enum
    const llm = stubLlm(makeAnalysisJson([badAgent]));
    await expect(analyzeFirm(SCRAPED, llm, 5)).rejects.toThrow(
      /schema validation failed/i,
    );
  });

  it("throws when a numeric field is out of range", async () => {
    const badAgent = makeValidAgentPayload({ billingRateUsd: 9999 }); // max is 5000
    const llm = stubLlm(makeAnalysisJson([badAgent]));
    await expect(analyzeFirm(SCRAPED, llm, 5)).rejects.toThrow(
      /schema validation failed/i,
    );
  });

  it("propagates LLM function errors", async () => {
    const llm: LlmFn = async () => { throw new Error("LLM unavailable"); };
    await expect(analyzeFirm(SCRAPED, llm, 5)).rejects.toThrow("LLM unavailable");
  });
});

// ── analyzeFirm — markdown-fenced JSON from LLM ───────────────────────────

describe("analyzeFirm — handles markdown-fenced JSON", () => {
  it("parses profiles when LLM wraps JSON in ```json fences", async () => {
    const json = makeAnalysisJson([makeValidAgentPayload()]);
    const fenced = `Here are the agents:\n\`\`\`json\n${json}\n\`\`\``;
    const llm = stubLlm(fenced);
    const profiles = await analyzeFirm(SCRAPED, llm, 5);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].seenOnSite).toBeTruthy();
  });
});
