import { describe, it, expect } from "vitest";
import {
  INTENSITY_PROFILES,
  pickIntensity,
  escalate,
  profileFor,
  type Intensity,
} from "./effort";

describe("INTENSITY_PROFILES", () => {
  it("skill budget rises monotonically quick < standard < thorough", () => {
    expect(INTENSITY_PROFILES.quick.skillBudget).toBeLessThan(
      INTENSITY_PROFILES.standard.skillBudget,
    );
    expect(INTENSITY_PROFILES.standard.skillBudget).toBeLessThan(
      INTENSITY_PROFILES.thorough.skillBudget,
    );
  });

  it("never exceeds the previous hard cap of 13 skills", () => {
    for (const k of Object.keys(INTENSITY_PROFILES) as Intensity[]) {
      expect(INTENSITY_PROFILES[k].skillBudget).toBeLessThanOrEqual(13);
    }
  });

  it("maps tiers: quick→low, standard→mid, thorough→main", () => {
    expect(INTENSITY_PROFILES.quick.modelTier).toBe("low");
    expect(INTENSITY_PROFILES.standard.modelTier).toBe("mid");
    expect(INTENSITY_PROFILES.thorough.modelTier).toBe("main");
  });

  it("budget multiplier rises with intensity", () => {
    expect(INTENSITY_PROFILES.quick.budgetMultiplier).toBeLessThan(
      INTENSITY_PROFILES.standard.budgetMultiplier,
    );
    expect(INTENSITY_PROFILES.standard.budgetMultiplier).toBeLessThan(
      INTENSITY_PROFILES.thorough.budgetMultiplier,
    );
  });
});

describe("pickIntensity", () => {
  it("short + simple message → quick (fewer skills, low effort, low model tier)", () => {
    const intensity = pickIntensity({ messageWords: 5, complexity: "low", riskLevel: "low" });
    expect(intensity).toBe("quick");
    const p = profileFor(intensity);
    expect(p.effort).toBe("low");
    expect(p.modelTier).toBe("low");
    expect(p.skillBudget).toBe(INTENSITY_PROFILES.quick.skillBudget);
  });

  it("short message with no complexity/risk signal still → quick", () => {
    expect(pickIntensity({ messageWords: 4 })).toBe("quick");
  });

  it("long message → thorough (more skills, high effort, main model)", () => {
    const intensity = pickIntensity({ messageWords: 120 });
    expect(intensity).toBe("thorough");
    const p = profileFor(intensity);
    expect(p.effort).toBe("high");
    expect(p.modelTier).toBe("main");
    expect(p.skillBudget).toBeGreaterThan(INTENSITY_PROFILES.quick.skillBudget);
  });

  it("high risk → thorough even for a short message", () => {
    expect(pickIntensity({ messageWords: 6, riskLevel: "high" })).toBe("thorough");
  });

  it("high complexity → thorough even for a short message", () => {
    expect(pickIntensity({ messageWords: 6, complexity: "high" })).toBe("thorough");
  });

  it("medium-length, unremarkable message → standard", () => {
    expect(pickIntensity({ messageWords: 30 })).toBe("standard");
  });
});

describe("escalate", () => {
  it("low confidence bumps one tier up", () => {
    expect(escalate("quick", { confidence: 0.3 })).toBe("standard");
    expect(escalate("standard", { confidence: 0.2 })).toBe("thorough");
  });

  it("high risk bumps one tier up", () => {
    expect(escalate("quick", { riskLevel: "high" })).toBe("standard");
  });

  it("does not escalate when confidence is high and risk is not high", () => {
    expect(escalate("quick", { confidence: 0.9 })).toBe("quick");
    expect(escalate("standard", { confidence: 0.8, riskLevel: "low" })).toBe("standard");
  });

  it("caps at thorough (idempotent at ceiling)", () => {
    expect(escalate("thorough", { confidence: 0.1 })).toBe("thorough");
    expect(escalate("thorough", { riskLevel: "high" })).toBe("thorough");
  });

  it("no signals → unchanged", () => {
    expect(escalate("standard", {})).toBe("standard");
  });
});

describe("pickIntensity + escalate compose", () => {
  it("simple short message with low classifier confidence escalates quick → standard", () => {
    const base = pickIntensity({ messageWords: 5, complexity: "low", riskLevel: "low", confidence: 0.3 });
    expect(base).toBe("quick");
    expect(escalate(base, { confidence: 0.3 })).toBe("standard");
  });
});
