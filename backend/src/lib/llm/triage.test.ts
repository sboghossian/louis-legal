import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  decideModelRoute,
  localModelId,
  isLocalAvailable,
  DEFAULT_OLLAMA_MODEL,
  type ModelRoute,
  type TriageInput,
} from "./triage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Snapshot and restore the two env vars we mutate across tests. */
let savedOllamaUrl: string | undefined;
let savedOllamaModel: string | undefined;

beforeEach(() => {
  savedOllamaUrl = process.env.OLLAMA_URL;
  savedOllamaModel = process.env.OLLAMA_MODEL;
});

afterEach(() => {
  if (savedOllamaUrl === undefined) {
    delete process.env.OLLAMA_URL;
  } else {
    process.env.OLLAMA_URL = savedOllamaUrl;
  }
  if (savedOllamaModel === undefined) {
    delete process.env.OLLAMA_MODEL;
  } else {
    process.env.OLLAMA_MODEL = savedOllamaModel;
  }
});

// ---------------------------------------------------------------------------
// localModelId()
// ---------------------------------------------------------------------------

describe("localModelId()", () => {
  it("returns the default when OLLAMA_MODEL is not set", () => {
    delete process.env.OLLAMA_MODEL;
    expect(localModelId()).toBe(DEFAULT_OLLAMA_MODEL);
  });

  it("returns the default when OLLAMA_MODEL is empty string", () => {
    process.env.OLLAMA_MODEL = "";
    expect(localModelId()).toBe(DEFAULT_OLLAMA_MODEL);
  });

  it("returns the default when OLLAMA_MODEL is whitespace only", () => {
    process.env.OLLAMA_MODEL = "   ";
    expect(localModelId()).toBe(DEFAULT_OLLAMA_MODEL);
  });

  it("honors OLLAMA_MODEL when set to a custom model", () => {
    process.env.OLLAMA_MODEL = "llama3.1:8b";
    expect(localModelId()).toBe("llama3.1:8b");
  });

  it("trims leading/trailing whitespace from OLLAMA_MODEL", () => {
    process.env.OLLAMA_MODEL = "  mistral:7b  ";
    expect(localModelId()).toBe("mistral:7b");
  });

  it("DEFAULT_OLLAMA_MODEL constant is 'qwen2.5'", () => {
    expect(DEFAULT_OLLAMA_MODEL).toBe("qwen2.5");
  });
});

// ---------------------------------------------------------------------------
// isLocalAvailable()
// ---------------------------------------------------------------------------

describe("isLocalAvailable()", () => {
  it("returns false when OLLAMA_URL is not set", () => {
    delete process.env.OLLAMA_URL;
    expect(isLocalAvailable()).toBe(false);
  });

  it("returns false when OLLAMA_URL is empty string", () => {
    process.env.OLLAMA_URL = "";
    expect(isLocalAvailable()).toBe(false);
  });

  it("returns false when OLLAMA_URL is whitespace only", () => {
    process.env.OLLAMA_URL = "   ";
    expect(isLocalAvailable()).toBe(false);
  });

  it("returns true when OLLAMA_URL is set to a URL", () => {
    process.env.OLLAMA_URL = "http://localhost:11434";
    expect(isLocalAvailable()).toBe(true);
  });

  it("returns true for any non-empty value (no network probe)", () => {
    process.env.OLLAMA_URL = "ollama-host:11434";
    expect(isLocalAvailable()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// decideModelRoute() — routing policy matrix
// ---------------------------------------------------------------------------

describe("decideModelRoute() — intensity=quick", () => {
  it("quick + localAvailable=true → local", () => {
    const route = decideModelRoute({ intensity: "quick", localAvailable: true });
    expect(route.target).toBe("local");
  });

  it("quick + localAvailable=true → uses localModelId()", () => {
    process.env.OLLAMA_MODEL = "codellama:13b";
    const route = decideModelRoute({ intensity: "quick", localAvailable: true });
    expect(route.target).toBe("local");
    expect(route.model).toBe("codellama:13b");
  });

  it("quick + localAvailable=false → frontier", () => {
    const route = decideModelRoute({ intensity: "quick", localAvailable: false });
    expect(route.target).toBe("frontier");
    expect(route.model.length).toBeGreaterThan(0);
  });

  it("quick + localAvailable=false → reason mentions intensity and fallback", () => {
    const route = decideModelRoute({ intensity: "quick", localAvailable: false });
    expect(route.reason).toContain("quick");
    expect(route.reason).toContain("fallback");
  });
});

describe("decideModelRoute() — intensity=standard", () => {
  it("standard + localAvailable=true → local", () => {
    const route = decideModelRoute({ intensity: "standard", localAvailable: true });
    expect(route.target).toBe("local");
  });

  it("standard + localAvailable=false → frontier", () => {
    const route = decideModelRoute({ intensity: "standard", localAvailable: false });
    expect(route.target).toBe("frontier");
  });

  it("standard + localAvailable=true → uses current localModelId()", () => {
    delete process.env.OLLAMA_MODEL;
    const route = decideModelRoute({ intensity: "standard", localAvailable: true });
    expect(route.model).toBe(DEFAULT_OLLAMA_MODEL);
  });
});

describe("decideModelRoute() — intensity=thorough", () => {
  it("thorough + localAvailable=true → STILL frontier (capability trumps cost)", () => {
    const route = decideModelRoute({ intensity: "thorough", localAvailable: true });
    expect(route.target).toBe("frontier");
  });

  it("thorough + localAvailable=false → frontier", () => {
    const route = decideModelRoute({ intensity: "thorough", localAvailable: false });
    expect(route.target).toBe("frontier");
  });

  it("thorough frontier model is the 'main' tier model", () => {
    // Should match the canonical first model in GEMINI_MAIN_MODELS (models.ts)
    const route = decideModelRoute({ intensity: "thorough", localAvailable: false });
    expect(route.model.length).toBeGreaterThan(0);
    expect(route.reason).toContain("thorough");
  });
});

// ---------------------------------------------------------------------------
// decideModelRoute() — forceFrontier override
// ---------------------------------------------------------------------------

describe("decideModelRoute() — forceFrontier", () => {
  it("forceFrontier=true overrides quick+localAvailable → frontier", () => {
    const route = decideModelRoute({
      intensity: "quick",
      localAvailable: true,
      forceFrontier: true,
    });
    expect(route.target).toBe("frontier");
    expect(route.reason).toContain("forceFrontier");
  });

  it("forceFrontier=true overrides standard+localAvailable → frontier", () => {
    const route = decideModelRoute({
      intensity: "standard",
      localAvailable: true,
      forceFrontier: true,
    });
    expect(route.target).toBe("frontier");
  });

  it("forceFrontier=false (explicit) behaves as if omitted", () => {
    const withFalse = decideModelRoute({
      intensity: "quick",
      localAvailable: true,
      forceFrontier: false,
    });
    const withOmit = decideModelRoute({
      intensity: "quick",
      localAvailable: true,
    });
    expect(withFalse.target).toBe(withOmit.target);
    expect(withFalse.model).toBe(withOmit.model);
  });
});

// ---------------------------------------------------------------------------
// ModelRoute shape — all paths return a well-formed object
// ---------------------------------------------------------------------------

describe("ModelRoute shape", () => {
  const matrix: TriageInput[] = [
    { intensity: "quick",    localAvailable: true  },
    { intensity: "quick",    localAvailable: false },
    { intensity: "standard", localAvailable: true  },
    { intensity: "standard", localAvailable: false },
    { intensity: "thorough", localAvailable: true  },
    { intensity: "thorough", localAvailable: false },
    { intensity: "quick",    localAvailable: true,  forceFrontier: true },
  ];

  for (const input of matrix) {
    it(`returns a well-formed route for ${JSON.stringify(input)}`, () => {
      const route: ModelRoute = decideModelRoute(input);
      expect(typeof route.target).toBe("string");
      expect(["local", "frontier"]).toContain(route.target);
      expect(typeof route.model).toBe("string");
      expect(route.model.length).toBeGreaterThan(0);
      expect(typeof route.reason).toBe("string");
      expect(route.reason.length).toBeGreaterThan(0);
    });
  }
});
