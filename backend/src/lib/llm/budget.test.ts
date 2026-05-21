import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  estimateTurnCostUsd,
  withinBudget,
  turnBudgetCeilingUsd,
  rateForModel,
} from "./budget";

describe("estimateTurnCostUsd", () => {
  it("computes cost from per-model rates", () => {
    // haiku: $1/M in, $5/M out → 1M in + 1M out = $1 + $5 = $6
    const cost = estimateTurnCostUsd({
      model: "claude-haiku-4-5",
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(6, 6);
  });

  it("a frontier model is more expensive than a low-tier model for the same tokens", () => {
    const opus = estimateTurnCostUsd({ model: "claude-opus-4-7", inputTokens: 100_000, outputTokens: 50_000 });
    const haiku = estimateTurnCostUsd({ model: "claude-haiku-4-5", inputTokens: 100_000, outputTokens: 50_000 });
    expect(opus).toBeGreaterThan(haiku);
  });

  it("falls back to a mid-tier rate for unknown models", () => {
    const known = rateForModel("claude-sonnet-4-6");
    const unknown = rateForModel("totally-made-up-model");
    expect(unknown.inUsdPerM).toBe(known.inUsdPerM);
    expect(unknown.outUsdPerM).toBe(known.outUsdPerM);
  });

  it("clamps negative token counts to zero", () => {
    const cost = estimateTurnCostUsd({ model: "claude-opus-4-7", inputTokens: -100, outputTokens: -100 });
    expect(cost).toBe(0);
  });
});

describe("withinBudget", () => {
  it("flags a turn that exceeds the ceiling", () => {
    // 1M in + 1M out on opus = $15 + $75 = $90, well over a $1 ceiling
    const est = estimateTurnCostUsd({ model: "claude-opus-4-7", inputTokens: 1_000_000, outputTokens: 1_000_000 });
    expect(withinBudget(est, 1.0)).toBe(false);
  });

  it("passes a cheap turn under the ceiling", () => {
    const est = estimateTurnCostUsd({ model: "claude-haiku-4-5", inputTokens: 2_000, outputTokens: 500 });
    expect(withinBudget(est, 1.0)).toBe(true);
  });

  it("treats an estimate equal to the ceiling as within budget", () => {
    expect(withinBudget(1.0, 1.0)).toBe(true);
  });
});

describe("turnBudgetCeilingUsd", () => {
  const ORIGINAL = process.env.LOUIS_TURN_BUDGET_USD;

  beforeEach(() => {
    delete process.env.LOUIS_TURN_BUDGET_USD;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.LOUIS_TURN_BUDGET_USD;
    else process.env.LOUIS_TURN_BUDGET_USD = ORIGINAL;
  });

  it("defaults to 1.0 when env is unset", () => {
    expect(turnBudgetCeilingUsd()).toBe(1.0);
  });

  it("reads a positive override from env", () => {
    process.env.LOUIS_TURN_BUDGET_USD = "2.5";
    expect(turnBudgetCeilingUsd()).toBe(2.5);
  });

  it("ignores a non-numeric or non-positive override", () => {
    process.env.LOUIS_TURN_BUDGET_USD = "not-a-number";
    expect(turnBudgetCeilingUsd()).toBe(1.0);
    process.env.LOUIS_TURN_BUDGET_USD = "-5";
    expect(turnBudgetCeilingUsd()).toBe(1.0);
  });
});
