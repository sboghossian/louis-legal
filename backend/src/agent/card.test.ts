/**
 * Tests for buildAgentCard().
 *
 * Pure unit tests — no server boot, no network, no env vars required.
 */

import { describe, it, expect } from "vitest";
import { buildAgentCard } from "./card";
import type { AgentCard } from "./card";

describe("buildAgentCard()", () => {
  // -----------------------------------------------------------------------
  // Shape
  // -----------------------------------------------------------------------

  it("returns an object with the required top-level keys", () => {
    const card = buildAgentCard();
    const requiredKeys: (keyof AgentCard)[] = [
      "spec",
      "name",
      "description",
      "version",
      "homepage",
      "capabilities",
      "endpoints",
    ];
    for (const key of requiredKeys) {
      expect(card).toHaveProperty(key);
    }
  });

  // -----------------------------------------------------------------------
  // Non-empty claims
  // -----------------------------------------------------------------------

  it("has a non-empty name", () => {
    const { name } = buildAgentCard();
    expect(name.trim().length).toBeGreaterThan(0);
  });

  it("has a non-empty description", () => {
    const { description } = buildAgentCard();
    expect(description.trim().length).toBeGreaterThan(0);
  });

  it("name is 'Louis'", () => {
    expect(buildAgentCard().name).toBe("Louis");
  });

  it("version defaults to '1.0.0'", () => {
    expect(buildAgentCard().version).toBe("1.0.0");
  });

  it("version can be overridden via opts", () => {
    expect(buildAgentCard({ version: "2.3.4" }).version).toBe("2.3.4");
  });

  it("has at least one capability", () => {
    const { capabilities } = buildAgentCard();
    expect(capabilities.length).toBeGreaterThan(0);
  });

  it("every capability has a non-empty name and description", () => {
    const { capabilities } = buildAgentCard();
    for (const cap of capabilities) {
      expect(cap.name.trim().length).toBeGreaterThan(0);
      expect(cap.description.trim().length).toBeGreaterThan(0);
    }
  });

  // -----------------------------------------------------------------------
  // Endpoints — shape and real paths
  // -----------------------------------------------------------------------

  it("endpoints object has chat, documents, workflows and mcp keys", () => {
    const { endpoints } = buildAgentCard();
    expect(endpoints).toHaveProperty("chat");
    expect(endpoints).toHaveProperty("documents");
    expect(endpoints).toHaveProperty("workflows");
    expect(endpoints).toHaveProperty("mcp");
  });

  it("mcp endpoint points to /api/mcp (matching the real MCP router mount)", () => {
    const { endpoints } = buildAgentCard();
    expect(endpoints.mcp).toMatch(/\/api\/mcp$/);
  });

  it("chat endpoint points to /chat (matching the real chat router mount)", () => {
    const { endpoints } = buildAgentCard();
    expect(endpoints.chat).toMatch(/\/chat$/);
  });

  it("documents endpoint points to /single-documents (matching the real documents router mount)", () => {
    const { endpoints } = buildAgentCard();
    expect(endpoints.documents).toMatch(/\/single-documents$/);
  });

  it("workflows endpoint points to /workflows (matching the real workflows router mount)", () => {
    const { endpoints } = buildAgentCard();
    expect(endpoints.workflows).toMatch(/\/workflows$/);
  });

  // -----------------------------------------------------------------------
  // baseUrl override
  // -----------------------------------------------------------------------

  it("prefixes all endpoints with the given baseUrl", () => {
    const base = "https://api.louis.legal";
    const { endpoints } = buildAgentCard({ baseUrl: base });
    expect(endpoints.chat).toBe(`${base}/chat`);
    expect(endpoints.documents).toBe(`${base}/single-documents`);
    expect(endpoints.workflows).toBe(`${base}/workflows`);
    expect(endpoints.mcp).toBe(`${base}/api/mcp`);
  });

  it("strips a trailing slash from baseUrl before prefixing", () => {
    const { endpoints } = buildAgentCard({ baseUrl: "https://api.louis.legal/" });
    expect(endpoints.mcp).toBe("https://api.louis.legal/api/mcp");
  });

  it("produces root-relative paths when baseUrl is omitted", () => {
    const { endpoints } = buildAgentCard();
    expect(endpoints.chat).toBe("/chat");
    expect(endpoints.mcp).toBe("/api/mcp");
  });

  it("produces root-relative paths when baseUrl is empty string", () => {
    const { endpoints } = buildAgentCard({ baseUrl: "" });
    expect(endpoints.mcp).toBe("/api/mcp");
  });

  // -----------------------------------------------------------------------
  // Spec field
  // -----------------------------------------------------------------------

  it("spec is a non-empty string", () => {
    expect(buildAgentCard().spec.trim().length).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // Homepage
  // -----------------------------------------------------------------------

  it("homepage is a valid-looking URL", () => {
    const { homepage } = buildAgentCard();
    expect(homepage).toMatch(/^https?:\/\//);
  });
});
