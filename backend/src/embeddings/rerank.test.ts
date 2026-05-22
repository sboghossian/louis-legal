/**
 * Tests for Wave 3 — rerank.ts
 *
 * All tests are fully offline: no Cohere calls. The fake RerankClient is
 * injected via `opts.client` so the real `defaultCohereClient` is never
 * reached.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rerank, isRerankConfigured, type RerankCandidate, type RerankClient } from "./rerank";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CANDIDATES: RerankCandidate[] = [
  { id: "c1", text: "Force majeure clause in UAE commercial contracts" },
  { id: "c2", text: "Arbitration seat and governing law in DIFC agreements" },
  { id: "c3", text: "Liquidated damages cap under ADGM framework" },
  { id: "c4", text: "Non-compete enforceability in Egyptian labour law" },
  { id: "c5", text: "Confidentiality obligations post-termination" },
];

/** A fake RerankClient that reverses the relevance order of the first topN docs. */
const reverseFakeClient: RerankClient = async (_query, docs, topN) => {
  const count = Math.min(topN, docs.length);
  // highest score goes to the LAST document in the slice
  return Array.from({ length: count }, (_, i) => ({
    index: count - 1 - i,
    relevanceScore: (count - i) / count,
  }));
};

/** A fake client that returns a hand-crafted relevance ranking. */
const topThreeFakeClient: RerankClient = async (_query, _docs, topN) => {
  // Ranks: index 2 (score 0.95), index 0 (0.80), index 4 (0.60)
  const fullRanking = [
    { index: 2, relevanceScore: 0.95 },
    { index: 0, relevanceScore: 0.80 },
    { index: 4, relevanceScore: 0.60 },
    { index: 1, relevanceScore: 0.40 },
    { index: 3, relevanceScore: 0.20 },
  ];
  return fullRanking.slice(0, topN);
};

// ---------------------------------------------------------------------------
// isRerankConfigured
// ---------------------------------------------------------------------------

describe("isRerankConfigured()", () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    savedKey = process.env.COHERE_API_KEY;
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env.COHERE_API_KEY;
    } else {
      process.env.COHERE_API_KEY = savedKey;
    }
  });

  it("returns false when COHERE_API_KEY is absent", () => {
    delete process.env.COHERE_API_KEY;
    expect(isRerankConfigured()).toBe(false);
  });

  it("returns false when COHERE_API_KEY is an empty string", () => {
    process.env.COHERE_API_KEY = "   ";
    expect(isRerankConfigured()).toBe(false);
  });

  it("returns true when COHERE_API_KEY is set", () => {
    process.env.COHERE_API_KEY = "test-key-abc";
    expect(isRerankConfigured()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Identity fallback (no key, no client)
// ---------------------------------------------------------------------------

describe("rerank() — identity fallback", () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    savedKey = process.env.COHERE_API_KEY;
    delete process.env.COHERE_API_KEY;
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env.COHERE_API_KEY;
    } else {
      process.env.COHERE_API_KEY = savedKey;
    }
  });

  it("returns empty array for empty candidates", async () => {
    const result = await rerank("test query", []);
    expect(result).toEqual([]);
  });

  it("returns first topN candidates in identity order with score 0", async () => {
    const result = await rerank("force majeure", CANDIDATES, { topN: 3 });

    expect(result).toHaveLength(3);
    // Same order as input
    expect(result[0].id).toBe("c1");
    expect(result[1].id).toBe("c2");
    expect(result[2].id).toBe("c3");
    // All scores are neutral
    for (const r of result) {
      expect(r.score).toBe(0);
    }
  });

  it("returns all candidates when topN >= candidates.length", async () => {
    const result = await rerank("test", CANDIDATES, { topN: 100 });
    expect(result).toHaveLength(CANDIDATES.length);
    expect(result.map((r) => r.id)).toEqual(CANDIDATES.map((c) => c.id));
  });

  it("defaults topN to min(candidates.length, 10) when not specified", async () => {
    const result = await rerank("test", CANDIDATES);
    expect(result).toHaveLength(CANDIDATES.length); // 5 < 10, so returns all
  });

  it("preserves id and text fields in fallback", async () => {
    const single: RerankCandidate[] = [{ id: "x", text: "some legal text" }];
    const result = await rerank("query", single);
    expect(result[0]).toMatchObject({ id: "x", text: "some legal text", score: 0 });
  });
});

// ---------------------------------------------------------------------------
// Injected fake client — reordering + topN truncation
// ---------------------------------------------------------------------------

describe("rerank() — with injected fake client", () => {
  it("reorders candidates by descending relevance", async () => {
    const result = await rerank("arbitration", CANDIDATES, {
      topN: 5,
      client: topThreeFakeClient,
    });

    // topThreeFakeClient returns fullRanking.slice(0, 5) = all 5 items
    expect(result).toHaveLength(5);
    expect(result[0].id).toBe("c3"); // index 2 → highest score
    expect(result[0].score).toBeCloseTo(0.95);
    expect(result[1].id).toBe("c1"); // index 0
    expect(result[1].score).toBeCloseTo(0.80);
  });

  it("truncates to topN when client returns fewer results", async () => {
    // topThreeFakeClient returns 3 entries when topN=3
    const result = await rerank("DIFC", CANDIDATES, {
      topN: 3,
      client: topThreeFakeClient,
    });
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("c3");
    expect(result[1].id).toBe("c1");
    expect(result[2].id).toBe("c5");
  });

  it("reorders via reverseFakeClient — last candidate becomes first", async () => {
    const result = await rerank("query", CANDIDATES, {
      topN: 5,
      client: reverseFakeClient,
    });

    expect(result).toHaveLength(5);
    // reverseFakeClient: index 4, 3, 2, 1, 0
    expect(result[0].id).toBe("c5");
    expect(result[1].id).toBe("c4");
    expect(result[2].id).toBe("c3");
    expect(result[3].id).toBe("c2");
    expect(result[4].id).toBe("c1");
  });

  it("scores are propagated from the client response", async () => {
    const result = await rerank("query", CANDIDATES, {
      topN: 2,
      client: reverseFakeClient,
    });

    // reverseFakeClient: count=2, scores = 2/2=1.0 and 1/2=0.5
    expect(result[0].score).toBeCloseTo(1.0);
    expect(result[1].score).toBeCloseTo(0.5);
  });

  it("passes the correct query string to the client", async () => {
    const capturedQueries: string[] = [];
    const captureClient: RerankClient = async (query, docs, topN) => {
      capturedQueries.push(query);
      return docs.slice(0, topN).map((_, i) => ({ index: i, relevanceScore: 1 - i * 0.1 }));
    };

    await rerank("non-compete Egypt", CANDIDATES, { client: captureClient, topN: 2 });
    expect(capturedQueries).toEqual(["non-compete Egypt"]);
  });

  it("handles single candidate without throwing", async () => {
    const single: RerankCandidate[] = [{ id: "solo", text: "single clause" }];
    const simpleClient: RerankClient = async () => [{ index: 0, relevanceScore: 0.77 }];
    const result = await rerank("clause", single, { client: simpleClient });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("solo");
    expect(result[0].score).toBeCloseTo(0.77);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("rerank() — edge cases", () => {
  it("clamps topN to at least 1", async () => {
    delete process.env.COHERE_API_KEY;
    const result = await rerank("test", CANDIDATES, { topN: 0 });
    expect(result).toHaveLength(1);
  });

  it("does not throw when client is provided even if env key is missing", async () => {
    delete process.env.COHERE_API_KEY;
    const noopClient: RerankClient = async (_, docs, topN) =>
      docs.slice(0, topN).map((__, i) => ({ index: i, relevanceScore: 0.5 }));

    await expect(
      rerank("query", CANDIDATES, { topN: 2, client: noopClient }),
    ).resolves.toHaveLength(2);
  });
});
