/**
 * Tests for the opt-in triage-routed completion (Wave 4). The provider calls
 * (`completeText`, `completeOllamaText`, `pingOllama`) are mocked — no network.
 * decideModelRoute is the real pure function.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./index", () => ({ completeText: vi.fn(async () => "FRONTIER") }));
vi.mock("./ollama", () => ({
  completeOllamaText: vi.fn(async () => "LOCAL"),
  pingOllama: vi.fn(async () => true),
}));

import { completeRouted, localAvailability } from "./route";
import { completeText } from "./index";
import { completeOllamaText, pingOllama } from "./ollama";

const ORIG = process.env.OLLAMA_URL;
beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.OLLAMA_URL;
});
afterEach(() => {
  if (ORIG === undefined) delete process.env.OLLAMA_URL;
  else process.env.OLLAMA_URL = ORIG;
});

describe("localAvailability", () => {
  it("env-gates on OLLAMA_URL by default (no network)", async () => {
    expect(await localAvailability()).toBe(false);
    process.env.OLLAMA_URL = "http://localhost:11434";
    expect(await localAvailability()).toBe(true);
    expect(pingOllama).not.toHaveBeenCalled();
  });

  it("probes the network when asked", async () => {
    expect(await localAvailability(true)).toBe(true);
    expect(pingOllama).toHaveBeenCalled();
  });
});

describe("completeRouted", () => {
  it("routes a low-stakes turn to local Ollama when available", async () => {
    process.env.OLLAMA_URL = "http://localhost:11434";
    const r = await completeRouted({ intensity: "quick", user: "hi" });
    expect(r.route.target).toBe("local");
    expect(r.text).toBe("LOCAL");
    expect(completeOllamaText).toHaveBeenCalledTimes(1);
    expect(completeText).not.toHaveBeenCalled();
  });

  it("routes a high-stakes turn to frontier", async () => {
    process.env.OLLAMA_URL = "http://localhost:11434";
    const r = await completeRouted({ intensity: "thorough", user: "complex" });
    expect(r.route.target).toBe("frontier");
    expect(r.text).toBe("FRONTIER");
    expect(completeText).toHaveBeenCalledTimes(1);
    expect(completeOllamaText).not.toHaveBeenCalled();
  });

  it("routes to frontier when local is unavailable", async () => {
    const r = await completeRouted({ intensity: "quick", user: "hi" });
    expect(r.route.target).toBe("frontier");
    expect(completeText).toHaveBeenCalledTimes(1);
  });

  it("falls back to frontier when the local call throws", async () => {
    process.env.OLLAMA_URL = "http://localhost:11434";
    vi.mocked(completeOllamaText).mockRejectedValueOnce(new Error("ollama down"));
    const r = await completeRouted({ intensity: "quick", user: "hi" });
    expect(r.route.target).toBe("frontier");
    expect(r.text).toBe("FRONTIER");
    expect(completeText).toHaveBeenCalledTimes(1);
  });
});
