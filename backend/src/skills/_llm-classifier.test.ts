/**
 * Hand-crafted assertions for the deterministic routing heuristic.
 *
 * Runs without hitting any LLM provider: `classifyForRouting` is exercised
 * with no API keys and `allowServerKeys: false`, which forces the heuristic
 * fallback path. This keeps the test offline and reproducible.
 *
 * Run:    cd backend && npx tsx --test src/skills/_llm-classifier.test.ts
 * Or:     cd backend && node --import tsx --test src/skills/_llm-classifier.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyForRouting,
  _clearRoutingCache,
  _internals,
  type PracticeArea,
  type RoutingIntent,
} from "./_llm-classifier";

interface Case {
  name: string;
  message: string;
  matterTags?: string[];
  expectedPracticeArea: PracticeArea | null;
  expectedIntent?: RoutingIntent;
}

const CASES: Case[] = [
  {
    name: "MNDA request → corporate-commercial / draft",
    message: "Please draft an MNDA between Acme Ltd and Globex covering a potential partnership.",
    expectedPracticeArea: "corporate-commercial",
    expectedIntent: "draft",
  },
  {
    name: "UAE EOS calc → employment / calc",
    message: "Compute the end-of-service gratuity for a UAE employee with 7.5 years and AED 18,000 basic salary.",
    expectedPracticeArea: "employment",
    expectedIntent: "calc",
  },
  {
    name: "ICC RFA → arbitration / draft",
    message: "Draft a Request for Arbitration under the ICC Rules — seat London, claim USD 4.2m for breach of an MSA.",
    expectedPracticeArea: "arbitration",
    expectedIntent: "draft",
  },
  {
    name: "GDPR DPIA → privacy-data-protection / compliance",
    message: "We need a DPIA for a new cross-border data transfer to an AWS region in the US — GDPR compliance check.",
    expectedPracticeArea: "privacy-data-protection",
    expectedIntent: "compliance",
  },
  {
    name: "Trademark license → ip-licensing / draft",
    message: "Prepare a trademark licensing agreement granting worldwide use to a sub-licensee with royalty schedule.",
    expectedPracticeArea: "ip-licensing",
    expectedIntent: "draft",
  },
];

test("classifyForRouting picks the expected practice area for each prompt", async () => {
  for (const c of CASES) {
    _clearRoutingCache();
    const result = await classifyForRouting({
      message: c.message,
      matterTags: c.matterTags,
      // No keys and don't fall back to env keys — forces the heuristic.
      allowServerKeys: false,
    });
    assert.equal(
      result.practiceArea,
      c.expectedPracticeArea,
      `[${c.name}] expected practiceArea ${c.expectedPracticeArea} got ${result.practiceArea}`,
    );
    if (c.expectedIntent) {
      assert.equal(
        result.intent,
        c.expectedIntent,
        `[${c.name}] expected intent ${c.expectedIntent} got ${result.intent}`,
      );
    }
    assert.ok(
      result.recommendedModel,
      `[${c.name}] recommendedModel must be set (heuristic should always pick one)`,
    );
  }
});

test("matter tags override message text when message is generic", async () => {
  _clearRoutingCache();
  const result = await classifyForRouting({
    message: "Can you walk me through this?",
    matterTags: ["fintech-payments"],
    allowServerKeys: false,
  });
  assert.equal(result.practiceArea, "fintech-payments");
});

test("60s in-memory cache returns the same object marked source=cache", async () => {
  _clearRoutingCache();
  const first = await classifyForRouting({
    message: "Draft an MNDA",
    allowServerKeys: false,
  });
  const second = await classifyForRouting({
    message: "Draft an MNDA",
    allowServerKeys: false,
  });
  assert.equal(second.source, "cache");
  assert.equal(first.practiceArea, second.practiceArea);
  assert.equal(first.intent, second.intent);
});

test("heuristic intent: redline beats draft when both verbs are present", () => {
  const intent = _internals.heuristicIntent("Please redline the draft agreement attached.");
  assert.equal(intent, "redline");
});

test("recommendModel returns Sonnet for drafting and Haiku for summarising", () => {
  const drafting = _internals.recommendModel("draft", "corporate-commercial");
  const summary = _internals.recommendModel("summarize", "employment");
  assert.match(drafting, /sonnet/);
  assert.match(summary, /haiku/);
});
